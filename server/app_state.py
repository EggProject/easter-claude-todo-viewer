import copy
import json
import os
import pathlib
import tempfile

DEFAULT={'schemaVersion':1,'currentSessionId':None,'watchedSessionIds':[]}


def _write(path,payload):
    path=pathlib.Path(path).expanduser(); path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix=path.name+'.',suffix='.tmp',dir=str(path.parent))
    try:
        with os.fdopen(fd,'w',encoding='utf-8') as fh:
            json.dump(payload,fh,ensure_ascii=False,indent=2); fh.write('\n')
        os.replace(tmp,path)
    finally:
        try: os.unlink(tmp)
        except FileNotFoundError: pass


class AppStateStore:
    def __init__(self,path): self.path=pathlib.Path(path).expanduser(); self.state=copy.deepcopy(DEFAULT)

    def load(self,sessions):
        try: raw=json.loads(self.path.read_text(encoding='utf-8')) if self.path.exists() else {}
        except Exception: raw={}
        known=[str(item.get('id')) for item in (sessions or []) if item.get('id')]
        current=raw.get('currentSessionId') if isinstance(raw,dict) else None
        watched=list(raw.get('watchedSessionIds') or []) if isinstance(raw,dict) else []
        watched=[str(x) for x in watched if str(x) in known]
        if current not in known: current=known[0] if known else None
        if current and current not in watched: watched.insert(0,current)
        self.state={'schemaVersion':1,'currentSessionId':current,'watchedSessionIds':list(dict.fromkeys(watched))}
        _write(self.path,self.state)
        return copy.deepcopy(self.state)

    def get(self): return copy.deepcopy(self.state)

    def switch(self,session_id,sessions):
        known={str(x.get('id')) for x in sessions or [] if x.get('id')}
        if session_id not in known: raise KeyError(session_id)
        self.state['currentSessionId']=session_id
        if session_id not in self.state['watchedSessionIds']: self.state['watchedSessionIds'].append(session_id)
        _write(self.path,self.state); return self.get()

    def set_watched(self,session_id,watched,sessions):
        known={str(x.get('id')) for x in sessions or [] if x.get('id')}
        if session_id not in known: raise KeyError(session_id)
        current=self.state.get('currentSessionId')
        ids=list(self.state.get('watchedSessionIds') or [])
        if watched:
            if session_id not in ids: ids.append(session_id)
        elif session_id!=current:
            ids=[x for x in ids if x!=session_id]
        self.state['watchedSessionIds']=ids
        if current and current not in ids: ids.insert(0,current)
        _write(self.path,self.state); return self.get()
