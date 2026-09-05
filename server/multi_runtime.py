import copy
import json
import pathlib
import queue
import threading
import time
from dataclasses import dataclass, field

from claude_todos.settings import AppSettingsStore
from claude_todos.prompts import PromptManager
from claude_todos.providers.anthropic import AnthropicProvider
from .app_state import AppStateStore
from .session_registry import SessionRegistry
from . import session_core as core


@dataclass
class DaemonConfig:
    claude_home: pathlib.Path = pathlib.Path('~/.claude')
    cache_root: pathlib.Path = pathlib.Path('~/.claude-todos/cache')
    settings_file: pathlib.Path = pathlib.Path('~/.claude-todos/config.json')
    app_state_file: pathlib.Path = pathlib.Path('~/.claude-todos/app-state.json')
    log_root: pathlib.Path = pathlib.Path('~/.claude-todos/logs')
    agy_bin: str = 'agy'
    initial_status: str = 'all'
    initial_sort: str = 'dependency'
    version: str = '4.1.0'
    log_file: bool = False
    log_output: bool = False
    client_origins: list = field(default_factory=lambda:['http://127.0.0.1:8766','http://localhost:8766'])
    port: int = 8765


class MultiSessionRuntime:
    def __init__(self, config, start_background=True):
        self.config=config
        self.claude_home=pathlib.Path(config.claude_home).expanduser()
        self.registry=SessionRegistry(self.claude_home)
        self.app_state_store=AppStateStore(config.app_state_file)
        self.sessions=self._discover_sessions()
        self._session_map={item['id']:item for item in self.sessions}
        self.app_state_store.load(self.sessions)
        self.hub=core.EventHub()
        self.translation_requests=queue.Queue()
        self.stop_event=threading.Event()
        self.children={}
        self.children_lock=threading.RLock()
        self.provider_gate=threading.Condition(threading.RLock())
        self.provider_active_counts={}
        self.settings_store=AppSettingsStore(config.settings_file)
        settings=self.settings_store.load()
        self.settings_full=settings
        prompt_root=pathlib.Path(config.settings_file).expanduser().parent/'prompts'
        builtin_root=pathlib.Path(__file__).resolve().parent.parent/'claude_todos'/'builtin_prompts'
        self.prompt_manager=PromptManager(prompt_root,builtin_root,auto_migrate=bool((settings.get('prompts') or {}).get('autoMigrate',True)))
        self.prompt_manager.ensure()
        tr=settings.get('translation') or {}
        self.provider_concurrency_limits={
            'agy': max(1,min(32,int((tr.get('agy') or {}).get('maxConcurrency',2) or 2))),
            'anthropic': max(1,min(32,int((tr.get('anthropic') or {}).get('maxConcurrency',2) or 2))),
        }
        self.watch_state={}
        self._stats_cache={}
        self.next_registry_refresh=time.monotonic()+5.0
        self.translation_thread=None
        self.watcher_thread=None
        if start_background:
            self.translation_thread=threading.Thread(target=self.translation_loop,name='claude-todos-global-translate',daemon=True)
            self.translation_thread.start()
            self.watcher_thread=threading.Thread(target=self.watcher_loop,name='claude-todos-multi-watch',daemon=True)
            self.watcher_thread.start()
        current=self.app_state().get('currentSessionId')
        if current:
            self.get_runtime(current)

    def _discover_sessions(self, force=False):
        discovered=self.registry.discover(force=force)
        by_id={item['id']:dict(item) for item in discovered}
        # Preserve cached sessions even after Claude's transcript retention removes JSONL.
        cache_root=pathlib.Path(self.config.cache_root).expanduser()
        for session_file in cache_root.glob('projects/*/sessions/*/session.json'):
            try: meta=json.loads(session_file.read_text(encoding='utf-8'))
            except Exception: continue
            sid=str(meta.get('sessionId') or session_file.parent.name)
            if sid in by_id: continue
            cwd=str(meta.get('projectCwd') or '')
            transcript=str(meta.get('transcriptPath') or '')
            label=sid
            by_id[sid]={
                'id':sid,'transcript':transcript,'projectKey':session_file.parents[2].name,'cwd':cwd,
                'gitBranch':'','customTitle':'','summary':'','firstPrompt':'','label':label,
                'createdAt':meta.get('createdAt') or '','lastActivity':meta.get('lastObservedAt') or '',
                'messageCount':0,'fileSize':0,'mtime':0.0,
                'candidateIds':[sid,f'session-{sid[:8]}']+([pathlib.Path(cwd).name] if cwd else []),
                'cachedOnly':True,
            }
        result=list(by_id.values())
        result.sort(key=lambda item:(str(item.get('lastActivity') or ''),item['id']),reverse=True)
        return result

    def refresh_sessions(self, force=False):
        previous={(item.get('id'),item.get('lastActivity'),item.get('fileSize')) for item in getattr(self,'sessions',[]) or []}
        self.sessions=self._discover_sessions(force=force); self._session_map={x['id']:x for x in self.sessions}
        if force: self.invalidate_session_stats()
        self.app_state_store.load(self.sessions)
        current={(item.get('id'),item.get('lastActivity'),item.get('fileSize')) for item in self.sessions}
        if previous!=current and hasattr(self,'hub'):
            self.hub.publish('sessions-changed',{'timestamp':core.now_iso(),'appState':self.app_state()})
        return self.sessions_state()

    def app_state(self): return self.app_state_store.get()

    def session_info(self,session_id):
        info=self._session_map.get(session_id)
        return copy.deepcopy(info) if info else None

    def session_brief(self,session_id):
        info=self.session_info(session_id) or {'id':session_id,'label':session_id,'cwd':''}
        return {'id':session_id,'label':info.get('label') or session_id,'cwd':info.get('cwd') or '', 'gitBranch':info.get('gitBranch') or ''}

    def _child_config(self,info):
        return core.Config(
            session_id=info['id'], transcript=info.get('transcript') or '', project_cwd=info.get('cwd') or '',
            task_root=self.claude_home/'tasks', candidate_ids=list(info.get('candidateIds') or [info['id']]),
            initial_status=self.config.initial_status,initial_sort=self.config.initial_sort,version=self.config.version,
            cache_root=pathlib.Path(self.config.cache_root).expanduser(),ui_dir=pathlib.Path(__file__).resolve().parent.parent/'client',
            agy_bin=self.config.agy_bin,no_open=True,port=0,log_file=self.config.log_file,log_output=self.config.log_output,
            log_root=pathlib.Path(self.config.log_root).expanduser(),settings_file=pathlib.Path(self.config.settings_file).expanduser(),
        )

    def get_runtime(self,session_id,create=True):
        with self.children_lock:
            if session_id in self.children: return self.children[session_id]
            if not create: return None
            info=self.session_info(session_id)
            if not info: raise KeyError(session_id)
            child=core.DashboardRuntime(self._child_config(info),shared_translation_queue=self.translation_requests,shared_hub=self.hub,start_translation_worker=False)
            # Share one provider concurrency budget across all sessions.
            child.store.provider_gate=self.provider_gate
            child.store.provider_active_counts=self.provider_active_counts
            child.store.provider_concurrency_limits=self.provider_concurrency_limits
            child.store.configure_provider_concurrency(self.provider_concurrency_limits)
            self.children[session_id]=child
            self.invalidate_session_stats(session_id)
            return child

    def switch_session(self,session_id):
        state=self.app_state_store.switch(session_id,self.sessions)
        self.get_runtime(session_id)
        self.hub.publish('app-state-changed',{'timestamp':core.now_iso(),'appState':state})
        self.hub.publish('state-invalidated',{'reason':'session-switched','session':self.session_brief(session_id),'timestamp':core.now_iso()})
        return state

    def set_watched(self,session_id,watched):
        state=self.app_state_store.set_watched(session_id,watched,self.sessions)
        if watched: self.get_runtime(session_id)
        self.hub.publish('app-state-changed',{'timestamp':core.now_iso(),'appState':state})
        return state

    def _cache_session_dir(self,info):
        key=info.get('projectKey') if info.get('cachedOnly') and info.get('projectKey') else core.project_key(info.get('cwd') or '')
        return pathlib.Path(self.config.cache_root).expanduser()/'projects'/key/'sessions'/core.safe_component(info['id'])

    def _compute_cache_stats(self,info):
        session_dir=self._cache_session_dir(info)
        tasks=list(session_dir.glob('tasks/*/*/task.json')) if session_dir.is_dir() else []
        deleted=0
        for path in tasks:
            try:
                rec=json.loads(path.read_text(encoding='utf-8'))
                if rec.get('present') is False: deleted+=1
            except Exception: pass
        jobs=list((session_dir/'translation-jobs').glob('*.json')) if (session_dir/'translation-jobs').is_dir() else []
        return {'taskCount':len(tasks),'deletedTaskCount':deleted,'translationCount':len(jobs)}

    def invalidate_session_stats(self,session_id=None):
        if session_id is None:
            self._stats_cache.clear()
        else:
            self._stats_cache.pop(str(session_id),None)

    def _cache_stats(self,info):
        key=info['id']; cached=self._stats_cache.get(key)
        if cached is not None: return dict(cached)
        value=self._compute_cache_stats(info)
        self._stats_cache[key]=dict(value)
        return dict(value)

    def sessions_state(self):
        state=self.app_state(); watched=set(state.get('watchedSessionIds') or []); current=state.get('currentSessionId')
        rows=[]
        for info in self.sessions:
            row=dict(info); row.update(self._cache_stats(info)); row['watched']=info['id'] in watched; row['current']=info['id']==current
            child=self.get_runtime(info['id'],create=False)
            if child:
                language=child.store.session_meta.get('globalLanguage','en')
                row['globalLanguage']=language
                with child.language_lock:
                    pending=bool(child.pending_global_request)
                if not pending and language=='hu':
                    pending=any(job.get('status') in core.TranslationJobManager.ACTIVE for job in child.store.job_manager.list())
                row['globalTranslationPending']=bool(pending)
            else:
                try: cached=json.loads((self._cache_session_dir(info)/'session.json').read_text(encoding='utf-8'))
                except Exception: cached={}
                row['globalLanguage']=cached.get('globalLanguage','en')
                row['globalTranslationPending']=False
            rows.append(row)
        return {'sessions':rows,'currentSessionId':current,'watchedSessionIds':list(watched)}

    def settings_state(self):
        public=AppSettingsStore.public(self.settings_full)
        return {
            'version':4,
            'path':str(pathlib.Path(self.config.settings_file).expanduser()),
            'translation':public.get('translation') or {},
            'prompts':public.get('prompts') or {'autoMigrate':True},
            'agyModels':[{'slug':slug,'label':label} for slug,label in core.MODEL_OPTIONS],
        }

    def update_settings(self,data):
        data=copy.deepcopy(data or {})
        patch={}
        if 'translation' in data:
            patch['translation']=copy.deepcopy(data.get('translation') or {})
            incoming=(patch['translation'].get('anthropic') or {})
            existing=(((self.settings_full.get('translation') or {}).get('anthropic')) or {})
            if 'apiKey' not in incoming and existing.get('apiKey'):
                incoming['apiKey']=existing.get('apiKey')
            patch['translation']['anthropic']=incoming
        if 'prompts' in data: patch['prompts']=copy.deepcopy(data.get('prompts') or {})
        self.settings_full=self.settings_store.save(patch)
        self.prompt_manager.auto_migrate=bool((self.settings_full.get('prompts') or {}).get('autoMigrate',True))
        self.prompt_manager.ensure()
        tr=self.settings_full.get('translation') or {}
        for provider in ('agy','anthropic'):
            try: self.provider_concurrency_limits[provider]=max(1,min(32,int((tr.get(provider) or {}).get('maxConcurrency',2))))
            except Exception: self.provider_concurrency_limits[provider]=2
        with self.children_lock:
            for child in self.children.values():
                child.settings_full=copy.deepcopy(self.settings_full)
                child._refresh_runtime_settings()
        self.hub.publish('settings-changed',{'timestamp':core.now_iso()})
        return self.settings_state()

    def prompts_state(self): return self.prompt_manager.list()
    def prompt_detail(self,prompt_id):
        st=self.prompt_manager.get(prompt_id); st['diff']=self.prompt_manager.diff(prompt_id); return st
    def save_prompt(self,prompt_id,body):
        self.prompt_manager.save(prompt_id,body); st=self.prompt_detail(prompt_id); self.hub.publish('prompts-changed',{'promptId':prompt_id,'timestamp':core.now_iso()}); return st
    def restore_prompt(self,prompt_id):
        self.prompt_manager.restore(prompt_id); st=self.prompt_detail(prompt_id); self.hub.publish('prompts-changed',{'promptId':prompt_id,'timestamp':core.now_iso()}); return st
    def migrate_prompts(self):
        states=self.prompt_manager.ensure(); self.hub.publish('prompts-changed',{'timestamp':core.now_iso()}); return list(states.values())

    def anthropic_models(self):
        cfg=(((self.settings_full.get('translation') or {}).get('anthropic')) or {})
        return AnthropicProvider(cfg.get('baseUrl') or 'http://127.0.0.1:8000',cfg.get('apiKey') or '',cfg.get('model') or '').list_models()
    def anthropic_test(self,data=None):
        cfg=copy.deepcopy((((self.settings_full.get('translation') or {}).get('anthropic')) or {})); cfg.update({k:v for k,v in (data or {}).items() if k in {'baseUrl','apiKey','model'}})
        p=AnthropicProvider(cfg.get('baseUrl') or 'http://127.0.0.1:8000',cfg.get('apiKey') or '',cfg.get('model') or '')
        result=p.test_connection(); result['baseUrl']=p.base_url; return result

    def api_state(self,session_ids=None):
        state=self.app_state(); ids=list(session_ids or ([state.get('currentSessionId')] if state.get('currentSessionId') else []))
        tasks=[]; session_states=[]
        for sid in ids:
            if not sid: continue
            child=self.get_runtime(sid)
            sub=child.api_state(); brief=self.session_brief(sid)
            session_states.append({'session':brief,'globalLanguage':sub.get('globalLanguage','en'),'globalTranslationPending':sub.get('globalTranslationPending',False)})
            for task in sub.get('tasks') or []:
                item=copy.deepcopy(task); item['sessionId']=sid; item['session']=brief; item['sessionGlobalLanguage']=sub.get('globalLanguage','en'); tasks.append(item)
        current=state.get('currentSessionId'); current_child=self.get_runtime(current) if current else None
        current_state=current_child.api_state() if current_child else {}
        return {
            'version':self.config.version,'currentSessionId':current,'watchedSessionIds':state.get('watchedSessionIds') or [],
            'sessions':session_states,'tasks':tasks,'globalLanguage':current_state.get('globalLanguage','en'),
            'globalTranslationPending':current_state.get('globalTranslationPending',False),
            'initialStatus':self.config.initial_status,'initialSort':self.config.initial_sort,
        }

    def history(self,session_ids=None):
        ids=list(session_ids or self.app_state().get('watchedSessionIds') or [])
        rows=[]
        for sid in ids:
            child=self.get_runtime(sid); brief=self.session_brief(sid); sub=child.api_state(); task_by_uid={task.get('uid'):task for task in (sub.get('tasks') or [])}
            for event in child.store.history():
                item=copy.deepcopy(event); item['sessionId']=sid; item['session']=brief
                task=task_by_uid.get(item.get('uid'))
                if task:
                    item['taskSnapshot']={
                        'uid':task.get('uid'),'id':task.get('id'),'subject':task.get('subject'),'viewLanguage':task.get('viewLanguage'),
                        'effectiveLanguage':task.get('effectiveLanguage'),'translationState':task.get('translationState'),
                        'sessionGlobalLanguage':sub.get('globalLanguage','en'),
                    }
                rows.append(item)
        rows.sort(key=lambda e:str(e.get('detectedAt') or ''),reverse=True)
        return rows

    def _read_persisted_jobs(self,info):
        child=self.get_runtime(info['id'],create=False)
        if child: return child.translation_jobs()
        directory=self._cache_session_dir(info)/'translation-jobs'
        rows=[]
        if directory.is_dir():
            for path in directory.glob('*.json'):
                try:
                    value=json.loads(path.read_text(encoding='utf-8'))
                    if isinstance(value,dict): rows.append(value)
                except Exception: pass
        rows.sort(key=lambda j:str(j.get('queuedAt') or ''),reverse=True)
        return rows

    def translations(self):
        rows=[]
        for info in self.sessions:
            brief=self.session_brief(info['id'])
            for job in self._read_persisted_jobs(info):
                item=copy.deepcopy(job); item['sessionId']=info['id']; item['session']=brief; rows.append(item)
        rows.sort(key=lambda j:str(j.get('queuedAt') or ''),reverse=True)
        return rows

    def _cached_translation_catalog(self,info):
        child=self.get_runtime(info['id'],create=False)
        if child: return child.translation_catalog().get('tasks') or []
        session_dir=self._cache_session_dir(info); jobs=self._read_persisted_jobs(info); jobs_by_uid={}
        for job in jobs: jobs_by_uid.setdefault(job.get('uid'),[]).append(job)
        parents=[]
        for path in session_dir.glob('tasks/*/*/task.json') if session_dir.is_dir() else []:
            try: rec=json.loads(path.read_text(encoding='utf-8'))
            except Exception: continue
            uid=rec.get('uid'); versions=rec.get('sourceVersions') or {}; current=rec.get('current') or {}; tfp=current.get('textFingerprint')
            current_task=current.get('task') or {}; view=rec.get('viewLanguage') or rec.get('languagePreference') or 'en'
            tr=(((rec.get('translations') or {}).get('hu') or {}).get(tfp)) or {}
            ready=bool(tr.get('validated'))
            title=tr.get('title') if view=='hu' and ready else current_task.get('subject')
            children=[]
            ordered=sorted(versions.items(), key=lambda item:((item[1] or {}).get('firstObservedAt') or '',item[0]))
            nums={key:i+1 for i,(key,_v) in enumerate(ordered)}
            for job in jobs_by_uid.get(uid,[]):
                item=copy.deepcopy(job); jfp=item.get('textFingerprint'); src=versions.get(jfp) or {}
                item.update({'kind':'version','versionNumber':nums.get(jfp),'current':jfp==tfp,'sourceObservedAt':src.get('firstObservedAt'),'sourceTitle':src.get('subject',''),'sourceDescription':src.get('description','')}); children.append(item)
            children.sort(key=lambda c:(int(c.get('versionNumber') or 0),c.get('queuedAt') or ''),reverse=True)
            status=children[0].get('status') if children else ('ready' if ready else 'missing')
            parents.append({'kind':'task','uid':uid,'taskId':rec.get('taskId'),'title':title or f"Task #{rec.get('taskId')}",'viewLanguage':view,'effectiveLanguage':'hu' if view=='hu' and ready else 'en','translationState':'ready' if ready else status,'status':current_task.get('status'),'present':bool(rec.get('present',True)),'currentFingerprint':tfp,'versionCount':len(children),'children':children})
        parents.sort(key=lambda item:(int(item.get('taskId')) if str(item.get('taskId','')).isdigit() else 10**12,str(item.get('taskId') or '')))
        return parents

    def translation_catalog(self):
        rows=[]
        session_rows={row['id']:row for row in self.sessions_state().get('sessions') or []}
        for info in self.sessions:
            brief=self.session_brief(info['id']); session_language=(session_rows.get(info['id']) or {}).get('globalLanguage','en')
            for item in self._cached_translation_catalog(info):
                rec=copy.deepcopy(item); rec['sessionId']=info['id']; rec['session']=brief; rec['sessionGlobalLanguage']=session_language
                for child in rec.get('children') or []: child['sessionId']=info['id']; child['session']=brief
                rows.append(rec)
        return {'tasks':rows}

    def flow_layout(self,session_id): return self.get_runtime(session_id).flow_layout()
    def save_flow_layout(self,session_id,payload): return self.get_runtime(session_id).save_flow_layout(payload)
    def reset_flow_layout(self,session_id): return self.get_runtime(session_id).reset_flow_layout()

    def request_global_language(self,session_id,language):
        if language=='hu' and session_id not in set(self.app_state().get('watchedSessionIds') or []): self.set_watched(session_id,True)
        result=self.get_runtime(session_id).request_global_language(language); self.invalidate_session_stats(session_id); return result
    def cancel_global_translation(self,session_id): return self.get_runtime(session_id).cancel_global_translation()
    def request_task_language(self,session_id,uid,language):
        result=self.get_runtime(session_id).request_task_language(uid,language); self.invalidate_session_stats(session_id); return result
    def cancel_task_translation(self,session_id,uid): return self.get_runtime(session_id).cancel_task_translation(uid)

    def translation_job(self,session_id,job_id): return self.get_runtime(session_id).store.job_manager.get(job_id)
    def retry_translation_job(self,session_id,job_id):
        result=self.get_runtime(session_id).retry_translation_job(job_id); self.invalidate_session_stats(session_id); return result
    def cancel_translation_job(self,session_id,job_id): return self.get_runtime(session_id).cancel_translation_job(job_id)
    def delete_translation_job(self,session_id,job_id):
        result=self.get_runtime(session_id).delete_translation_job(job_id); self.invalidate_session_stats(session_id); return result

    def bulk_translation_action(self,action,job_refs):
        by_session={}
        if action in {'stop_all','retry_all_failed'}:
            for job in self.translations(): by_session.setdefault(job['sessionId'],[]).append(job['id'])
        else:
            for ref in job_refs or []:
                if isinstance(ref,dict): sid=ref.get('sessionId'); jid=ref.get('jobId') or ref.get('id')
                else:
                    # backward compatibility: resolve unique job id
                    matches=[j for j in self.translations() if j.get('id')==ref]
                    if len(matches)!=1: continue
                    sid=matches[0]['sessionId']; jid=ref
                if sid and jid: by_session.setdefault(sid,[]).append(jid)
        total={'action':action,'selected':0,'stopped':0,'retryStarted':0,'deleted':0,'skippedSuccess':0,'skippedActive':0,'skippedTerminal':0,'skippedNotRetryable':0,'skippedMissing':0,'errors':[]}
        for sid,ids in by_session.items():
            child=self.get_runtime(sid)
            child_action=action
            # global action must only target this session's ids; use regular action for deterministic aggregation.
            if action=='stop_all': child_action='stop'
            elif action=='retry_all_failed': child_action='retry'
            summary=child.bulk_translation_action(child_action,ids)
            for key in total:
                if key in {'action','errors'}: continue
                total[key]+=int(summary.get(key,0) or 0)
            total['errors'].extend([{'sessionId':sid,**e} for e in summary.get('errors') or []])
        return total

    def poll_session_once(self,session_id):
        child=self.get_runtime(session_id)
        events=child.store.poll_once(source='live')
        if not events: return []
        self.invalidate_session_stats(session_id)
        brief=self.session_brief(session_id)
        self.hub.publish('state-invalidated',{'reason':'tasks-updated','session':brief,'timestamp':core.now_iso()})
        localized=child._localize_specific(copy.deepcopy(events))
        sub_state=child.api_state(); task_by_uid={task.get('uid'):task for task in (sub_state.get('tasks') or [])}
        for event in localized:
            task=task_by_uid.get(event.get('uid'))
            if task:
                event['taskSnapshot']={
                    'uid':task.get('uid'),'id':task.get('id'),'subject':task.get('subject'),'viewLanguage':task.get('viewLanguage'),
                    'effectiveLanguage':task.get('effectiveLanguage'),'translationState':task.get('translationState'),
                    'sessionGlobalLanguage':sub_state.get('globalLanguage','en'),
                }
        self.hub.publish('notification',{'timestamp':core.now_iso(),'changes':localized,'session':brief})
        prepared=child.store.prepare_event_translations(events,trigger='tasks-updated',scope='retranslation')
        if prepared: child.schedule_prepared_translations(prepared,'tasks-updated')
        child.schedule_translation('tasks-updated')
        return events

    def watcher_loop(self):
        while not self.stop_event.wait(core.POLL_INTERVAL):
            # Refresh discovery on a stable cadence so brand-new sessions appear without
            # requiring a daemon restart or repeatedly rescanning within the same second.
            now=time.monotonic()
            if now>=self.next_registry_refresh:
                self.next_registry_refresh=now+5.0
                try: self.refresh_sessions()
                except Exception: pass
            watched=list(self.app_state().get('watchedSessionIds') or [])
            for sid in watched:
                try:
                    child=self.get_runtime(sid)
                    state=self.watch_state.setdefault(sid,{'signature':child.watch_signature(),'dirty':None})
                    sig=child.watch_signature()
                    if sig!=state['signature']:
                        state['signature']=sig; state['dirty']=time.monotonic(); continue
                    if state['dirty'] is not None and time.monotonic()-state['dirty']>=core.DEBOUNCE_SECONDS:
                        state['dirty']=None; self.poll_session_once(sid)
                except Exception as exc:
                    # Keep daemon alive even when one project/session disappears.
                    child=self.get_runtime(sid,create=False)
                    if child: child.logger.error('❌','WATCH',f'multi-session poll failed · {exc}')

    def translation_loop(self):
        while not self.stop_event.is_set():
            try: item=self.translation_requests.get(timeout=.25)
            except queue.Empty: continue
            try:
                sid=item.get('sessionId')
                if not sid: continue
                self.get_runtime(sid).process_translation_item(item)
            except Exception as exc:
                child=self.get_runtime(item.get('sessionId'),create=False) if item.get('sessionId') else None
                if child: child.logger.error('❌','SERVER',f'global translation worker failure · {exc}')
            finally: self.translation_requests.task_done()

    def close(self):
        self.stop_event.set()
        for thread in (self.watcher_thread,self.translation_thread):
            if thread and thread.is_alive() and thread is not threading.current_thread(): thread.join(timeout=2)
        with self.children_lock:
            for child in list(self.children.values()): child.close()
            self.children.clear()
