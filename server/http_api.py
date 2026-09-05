import json
import queue
import re
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, unquote, urlparse

from . import session_core as core


def _session_ids(query):
    raw=(query.get('sessionIds') or [''])[0]
    return [unquote(x) for x in raw.split(',') if x]


def make_handler(runtime):
    class Handler(BaseHTTPRequestHandler):
        protocol_version='HTTP/1.1'
        def log_message(self,fmt,*args): return
        def _origin(self): return self.headers.get('Origin')
        def _origin_allowed(self):
            origin=self._origin()
            return not origin or origin in set(runtime.config.client_origins or [])
        def _cors_headers(self):
            origin=self._origin()
            if origin and origin in set(runtime.config.client_origins or []):
                return {'Access-Control-Allow-Origin':origin,'Vary':'Origin'}
            return {}
        def send_bytes(self,status,content_type,payload,extra=None):
            self.send_response(status); self.send_header('Content-Type',content_type); self.send_header('Content-Length',str(len(payload))); self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff')
            headers={**self._cors_headers(),**(extra or {})}
            for key,value in headers.items(): self.send_header(key,value)
            self.end_headers()
            if payload: self.wfile.write(payload)
        def send_json(self,status,payload): self.send_bytes(status,'application/json; charset=utf-8',json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode('utf-8'))
        def read_body_json(self):
            try: length=int(self.headers.get('Content-Length','0'))
            except ValueError: length=0
            if length<=0: return {}
            raw=self.rfile.read(length)
            if not raw: return {}
            value=json.loads(raw.decode('utf-8'))
            if not isinstance(value,dict): raise ValueError('JSON body must be an object')
            return value
        def _guard(self):
            if not self._origin_allowed():
                self.send_json(403,{'error':'Origin is not allowed'}); return False
            return True
        def do_OPTIONS(self):
            if not self._origin_allowed(): self.send_json(403,{'error':'Origin is not allowed'}); return
            headers=self._cors_headers(); headers.update({'Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'})
            self.send_bytes(204,'text/plain; charset=utf-8',b'',headers)
        def do_GET(self):
            if not self._guard(): return
            parsed=urlparse(self.path); path=parsed.path; query=parse_qs(parsed.query)
            try:
                if path=='/api/sessions': self.send_json(200,runtime.sessions_state()); return
                if path=='/api/app-state': self.send_json(200,runtime.app_state()); return
                if path=='/api/state': self.send_json(200,runtime.api_state(_session_ids(query) or None)); return
                if path=='/api/history': self.send_json(200,{'history':runtime.history(_session_ids(query) or None)}); return
                if path=='/api/translations': self.send_json(200,{'jobs':runtime.translations()}); return
                if path=='/api/translation-catalog': self.send_json(200,runtime.translation_catalog()); return
                if path=='/api/settings': self.send_json(200,runtime.settings_state()); return
                if path=='/api/prompts': self.send_json(200,{'prompts':runtime.prompts_state()}); return
                if path=='/api/providers/anthropic/models':
                    try: self.send_json(200,{'models':runtime.anthropic_models()})
                    except Exception as exc: self.send_json(503,{'error':str(exc),'models':[]})
                    return
                if path=='/events': self.handle_events(); return
                m=re.fullmatch(r'/api/prompts/([^/]+)',path)
                if m: self.send_json(200,runtime.prompt_detail(unquote(m.group(1)))); return
                m=re.fullmatch(r'/api/sessions/([^/]+)/flow-layout',path)
                if m: self.send_json(200,runtime.flow_layout(unquote(m.group(1)))); return
                m=re.fullmatch(r'/api/sessions/([^/]+)/translations/([^/]+)',path)
                if m:
                    job=runtime.translation_job(unquote(m.group(1)),unquote(m.group(2)))
                    self.send_json(200,{'job':job}) if job else self.send_json(404,{'error':'Translation job not found'}); return
                self.send_json(404,{'error':'Not found'})
            except KeyError as exc: self.send_json(404,{'error':f'Not found: {exc}'})
            except Exception as exc: self.send_json(500,{'error':str(exc)})
        def do_PATCH(self):
            if not self._guard(): return
            path=urlparse(self.path).path
            try:
                data=self.read_body_json()
                if path=='/api/app-state':
                    if data.get('currentSessionId'): runtime.switch_session(str(data['currentSessionId']))
                    if 'watchedSessionIds' in data:
                        desired={str(x) for x in (data.get('watchedSessionIds') or [])}
                        for info in runtime.sessions:
                            runtime.set_watched(info['id'],info['id'] in desired)
                    self.send_json(200,runtime.app_state()); return
                self.send_json(404,{'error':'Not found'})
            except KeyError as exc: self.send_json(404,{'error':str(exc)})
            except Exception as exc: self.send_json(400,{'error':str(exc)})
        def do_POST(self):
            if not self._guard(): return
            path=urlparse(self.path).path
            try:
                data=self.read_body_json()
                if path=='/api/sessions/refresh': self.send_json(200,runtime.refresh_sessions(force=True)); return
                if path=='/api/settings': self.send_json(200,runtime.update_settings(data)); return
                if path=='/api/prompts/migrate': self.send_json(200,{'prompts':runtime.migrate_prompts()}); return
                if path=='/api/providers/anthropic/test': self.send_json(200,runtime.anthropic_test(data)); return
                if path=='/api/translations/bulk': self.send_json(202,{'summary':runtime.bulk_translation_action(data.get('action'),data.get('jobRefs') or data.get('jobIds') or [])}); return
                m=re.fullmatch(r'/api/prompts/([^/]+)/restore',path)
                if m: self.send_json(200,runtime.restore_prompt(unquote(m.group(1)))); return
                m=re.fullmatch(r'/api/prompts/([^/]+)',path)
                if m: self.send_json(200,runtime.save_prompt(unquote(m.group(1)),str(data.get('body','')))); return
                m=re.fullmatch(r'/api/sessions/([^/]+)/switch',path)
                if m: self.send_json(200,runtime.switch_session(unquote(m.group(1)))); return
                m=re.fullmatch(r'/api/sessions/([^/]+)/watch',path)
                if m: self.send_json(200,runtime.set_watched(unquote(m.group(1)),True)); return
                m=re.fullmatch(r'/api/sessions/([^/]+)/language',path)
                if m: self.send_json(202,runtime.request_global_language(unquote(m.group(1)),str(data.get('language','')))); return
                m=re.fullmatch(r'/api/sessions/([^/]+)/language/cancel',path)
                if m: self.send_json(200,{'jobs':runtime.cancel_global_translation(unquote(m.group(1)))}); return
                m=re.fullmatch(r'/api/sessions/([^/]+)/tasks/(.+)/language',path)
                if m: self.send_json(202,runtime.request_task_language(unquote(m.group(1)),unquote(m.group(2)),str(data.get('language','')))); return
                m=re.fullmatch(r'/api/sessions/([^/]+)/tasks/(.+)/translation/cancel',path)
                if m: self.send_json(200,{'jobs':runtime.cancel_task_translation(unquote(m.group(1)),unquote(m.group(2)))}); return
                m=re.fullmatch(r'/api/sessions/([^/]+)/flow-layout',path)
                if m: self.send_json(200,runtime.save_flow_layout(unquote(m.group(1)),data)); return
                m=re.fullmatch(r'/api/sessions/([^/]+)/translations/([^/]+)/(retry|cancel)',path)
                if m:
                    sid,jid,action=map(unquote,m.groups())
                    result=runtime.retry_translation_job(sid,jid) if action=='retry' else runtime.cancel_translation_job(sid,jid)
                    self.send_json(200,{'job':result}); return
                # Current-session compatibility aliases.
                current=runtime.app_state().get('currentSessionId')
                if path=='/api/language' and current: self.send_json(202,runtime.request_global_language(current,str(data.get('language','')))); return
                if path=='/api/language/cancel' and current: self.send_json(200,{'jobs':runtime.cancel_global_translation(current)}); return
                self.send_json(404,{'error':'Not found'})
            except KeyError as exc: self.send_json(404,{'error':str(exc)})
            except ValueError as exc: self.send_json(409,{'error':str(exc)})
            except Exception as exc: self.send_json(500,{'error':str(exc)})
        def do_DELETE(self):
            if not self._guard(): return
            path=urlparse(self.path).path
            try:
                m=re.fullmatch(r'/api/sessions/([^/]+)/watch',path)
                if m: self.send_json(200,runtime.set_watched(unquote(m.group(1)),False)); return
                m=re.fullmatch(r'/api/sessions/([^/]+)/flow-layout',path)
                if m: self.send_json(200,runtime.reset_flow_layout(unquote(m.group(1)))); return
                m=re.fullmatch(r'/api/sessions/([^/]+)/translations/([^/]+)',path)
                if m: self.send_json(200,{'job':runtime.delete_translation_job(unquote(m.group(1)),unquote(m.group(2)))}); return
                self.send_json(404,{'error':'Not found'})
            except KeyError as exc: self.send_json(404,{'error':str(exc)})
            except ValueError as exc: self.send_json(409,{'error':str(exc)})
            except Exception as exc: self.send_json(500,{'error':str(exc)})
        def handle_events(self):
            self.send_response(200); self.send_header('Content-Type','text/event-stream'); self.send_header('Cache-Control','no-cache'); self.send_header('Connection','keep-alive'); self.send_header('X-Accel-Buffering','no')
            for key,value in self._cors_headers().items(): self.send_header(key,value)
            self.end_headers(); q=queue.Queue(maxsize=512)
            with runtime.hub.lock: runtime.hub.clients.append(q)
            try:
                self.wfile.write(b': connected\n\n'); self.wfile.flush()
                while not runtime.stop_event.is_set():
                    try: rec=q.get(timeout=15); self._write_sse(rec)
                    except queue.Empty: self.wfile.write(b': heartbeat\n\n'); self.wfile.flush()
            except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError): pass
            finally:
                with runtime.hub.lock:
                    try: runtime.hub.clients.remove(q)
                    except ValueError: pass
        def _write_sse(self,rec):
            data=json.dumps(rec['payload'],ensure_ascii=False,separators=(',',':'))
            self.wfile.write(f"id: {rec['id']}\nevent: {rec['event']}\ndata: {data}\n\n".encode('utf-8')); self.wfile.flush()
    return Handler


def make_server(runtime,port=None):
    requested=runtime.config.port if port is None else int(port or 0)
    server=core.QuietThreadingHTTPServer(('127.0.0.1',requested),make_handler(runtime)); server.daemon_threads=True; return server
