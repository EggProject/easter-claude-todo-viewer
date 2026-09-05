import json
import pathlib
import re


def _iso_key(value):
    return str(value or '')


def _content_text(content):
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts=[]
        for item in content:
            if isinstance(item, dict) and item.get('type')=='text':
                parts.append(str(item.get('text') or ''))
            elif isinstance(item, str):
                parts.append(item)
        return '\n'.join(x for x in parts if x).strip()
    return ''


def _nested_value(record, names):
    for name in names:
        if record.get(name) not in (None, ''):
            return record.get(name)
    metadata=record.get('metadata') or {}
    if isinstance(metadata, dict):
        for name in names:
            if metadata.get(name) not in (None, ''):
                return metadata.get(name)
    return None


def _task_list_from_settings(path):
    try:
        data=json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return None
    for key in ('taskListId','task_list_id','taskList','task_list'):
        value=data.get(key) if isinstance(data,dict) else None
        if isinstance(value,str) and value.strip(): return value.strip()
    return None


class SessionRegistry:
    """Best-effort Claude Code CLI session discovery from local JSONL files only."""
    def __init__(self, claude_home):
        self.claude_home=pathlib.Path(claude_home).expanduser()
        self.projects_root=self.claude_home/'projects'
        self._cache=[]

    def discover(self):
        sessions=[]
        if not self.projects_root.is_dir():
            self._cache=[]
            return []
        for project_dir in sorted(self.projects_root.iterdir()):
            if not project_dir.is_dir(): continue
            try: files=sorted(project_dir.glob('*.jsonl'))
            except OSError: files=[]
            for transcript in files:
                if not transcript.is_file(): continue
                info=self._scan_transcript(transcript, project_dir)
                if info: sessions.append(info)
        sessions.sort(key=lambda item: (_iso_key(item.get('lastActivity')), item.get('id') or ''), reverse=True)
        self._cache=sessions
        return [dict(item) for item in sessions]

    def get(self, session_id):
        for info in self.discover():
            if info.get('id')==session_id: return info
        return None

    def _scan_transcript(self, path, project_dir):
        session_id=path.stem
        try: stat=path.stat()
        except OSError: return None
        cwd=''; branch=''; custom_title=''; summary=''; first_prompt=''; created=''; last=''; message_count=0
        try:
            fh=path.open('r',encoding='utf-8',errors='replace')
        except OSError:
            fh=None
        if fh:
            with fh:
                for raw in fh:
                    try: record=json.loads(raw)
                    except Exception: continue
                    if not isinstance(record,dict): continue
                    message_count+=1
                    ts=record.get('timestamp')
                    if ts:
                        ts=str(ts)
                        if not created or ts<created: created=ts
                        if not last or ts>last: last=ts
                    if not cwd:
                        value=_nested_value(record,('cwd','projectCwd','projectPath'))
                        if value: cwd=str(value)
                    value=_nested_value(record,('gitBranch','branch'))
                    if value: branch=str(value)
                    value=_nested_value(record,('customTitle','sessionName','name'))
                    if value: custom_title=str(value)
                    value=_nested_value(record,('summary','conversationSummary'))
                    if value: summary=str(value)
                    if not first_prompt and record.get('type')=='user':
                        msg=record.get('message') or {}
                        first_prompt=_content_text(msg.get('content') if isinstance(msg,dict) else msg)
        if not created:
            try: created=__import__('datetime').datetime.fromtimestamp(stat.st_ctime).astimezone().isoformat()
            except Exception: created=''
        if not last:
            try: last=__import__('datetime').datetime.fromtimestamp(stat.st_mtime).astimezone().isoformat()
            except Exception: last=''
        if not cwd:
            # Encoded project directory is lossy; keep it as project key rather than inventing a path.
            project_key=project_dir.name
        else:
            project_key=project_dir.name
        candidate_ids=[session_id, f'session-{session_id[:8]}']
        if cwd:
            candidate_ids.append(pathlib.Path(cwd).name)
            for settings_name in ('.claude/settings.json','.claude/settings.local.json'):
                value=_task_list_from_settings(pathlib.Path(cwd)/settings_name)
                if value: candidate_ids.append(value)
        env_list=__import__('os').environ.get('CLAUDE_CODE_TASK_LIST_ID','').strip()
        if env_list: candidate_ids.append(env_list)
        dedup=[]
        for value in candidate_ids:
            if value and value not in dedup: dedup.append(value)
        label=custom_title or summary or first_prompt or session_id
        if len(label)>120: label=label[:117]+'…'
        return {
            'id':session_id,'transcript':str(path),'projectKey':project_key,'cwd':cwd,
            'gitBranch':branch,'customTitle':custom_title,'summary':summary,'firstPrompt':first_prompt,
            'label':label,'createdAt':created,'lastActivity':last,'messageCount':message_count,
            'fileSize':int(stat.st_size),'mtime':float(stat.st_mtime),'candidateIds':dedup,
        }
