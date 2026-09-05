import datetime as dt
import difflib
import hashlib
import os
import pathlib
import re
import shutil
import subprocess
import tempfile

PROMPT_IDS=('translator-agent','translator-request','validator-agent','validator-request')
REQUIRED_VARS={
 'translator-agent':set(),
 'translator-request':{'source_title','source_description'},
 'validator-agent':set(),
 'validator-request':{'source_title','source_description','translated_title','translated_description'},
}

def sha(text): return hashlib.sha256(text.encode('utf-8')).hexdigest()

def split_prompt(text):
    text=str(text)
    if not text.startswith('---\n'): return {},text
    end=text.find('\n---\n',4)
    if end<0:return {},text
    meta={}
    for line in text[4:end].splitlines():
        if ':' in line:
            k,v=line.split(':',1); meta[k.strip()]=v.strip()
    return meta,text[end+5:]

def render_prompt(meta,body):
    order=('promptId','schemaVersion','builtinVersion','baseBuiltinSha256')
    head='\n'.join(f'{k}: {meta.get(k,"")}' for k in order)
    return f'---\n{head}\n---\n{body}'

def current_builtin_version(root,prompt_id):
    versions=[]
    for p in (pathlib.Path(root)/prompt_id).glob('v*.md'):
        m=re.fullmatch(r'v(\d+)\.md',p.name)
        if m: versions.append((int(m.group(1)),p))
    if not versions: raise FileNotFoundError(f'No built-in versions for {prompt_id}')
    return max(versions,key=lambda x:x[0])

class PromptManager:
    def __init__(self,user_dir,builtin_root,auto_migrate=True):
        self.user_dir=pathlib.Path(user_dir).expanduser(); self.builtin_root=pathlib.Path(builtin_root); self.auto_migrate=bool(auto_migrate)
    def _builtin(self,prompt_id,version=None):
        if version is None: version,path=current_builtin_version(self.builtin_root,prompt_id)
        else: path=self.builtin_root/prompt_id/f'v{int(version)}.md'
        meta,body=split_prompt(path.read_text(encoding='utf-8'))
        return int(version),body
    def _write_user(self,prompt_id,version,body,base_body=None):
        base_body=body if base_body is None else base_body
        meta={'promptId':prompt_id,'schemaVersion':1,'builtinVersion':int(version),'baseBuiltinSha256':sha(base_body)}
        path=self.user_dir/f'{prompt_id}.md'; path.parent.mkdir(parents=True,exist_ok=True)
        tmp=path.with_suffix('.md.tmp'); tmp.write_text(render_prompt(meta,body),encoding='utf-8'); os.replace(tmp,path)
    def _clear_conflict(self,prompt_id):
        cdir=self.user_dir/'conflicts'/prompt_id
        if cdir.exists(): shutil.rmtree(cdir,ignore_errors=True)

    def _backup_all(self):
        stamp=dt.datetime.now().astimezone().strftime('%Y-%m-%d_%H-%M-%S')
        dest=self.user_dir/'backups'/stamp; dest.mkdir(parents=True,exist_ok=True)
        for pid in PROMPT_IDS:
            p=self.user_dir/f'{pid}.md'
            if p.exists(): shutil.copy2(p,dest/p.name)
        return dest
    def _merge(self,base,current,incoming):
        git=shutil.which('git')
        if not git: return None,True
        with tempfile.TemporaryDirectory(prefix='claude-todos-prompt-merge-') as d:
            d=pathlib.Path(d); a=d/'current'; b=d/'base'; c=d/'incoming'
            a.write_text(current,encoding='utf-8');b.write_text(base,encoding='utf-8');c.write_text(incoming,encoding='utf-8')
            r=subprocess.run([git,'merge-file','-p',str(a),str(b),str(c)],text=True,capture_output=True)
            return r.stdout, r.returncode!=0
    def ensure(self):
        self.user_dir.mkdir(parents=True,exist_ok=True); states={}; backed=False
        for pid in PROMPT_IDS:
            latest,latest_body=self._builtin(pid); path=self.user_dir/f'{pid}.md'
            if not path.exists(): self._write_user(pid,latest,latest_body); states[pid]=self.state(pid); continue
            meta,body=split_prompt(path.read_text(encoding='utf-8')); installed=int(meta.get('builtinVersion') or 0)
            if installed>=latest: states[pid]=self.state(pid); continue
            try: _,base_body=self._builtin(pid,installed)
            except Exception: base_body=''
            modified=sha(body)!=str(meta.get('baseBuiltinSha256') or sha(base_body))
            if not self.auto_migrate:
                st=self.state(pid); st['status']='update_available'; states[pid]=st; continue
            if not backed: self._backup_all(); backed=True
            if not modified:
                self._clear_conflict(pid); self._write_user(pid,latest,latest_body); states[pid]=self.state(pid); continue
            merged,conflict=self._merge(base_body,body,latest_body)
            if conflict:
                cdir=self.user_dir/'conflicts'/pid; cdir.mkdir(parents=True,exist_ok=True)
                (cdir/f'v{installed}-to-v{latest}.md').write_text(merged or '',encoding='utf-8')
                st=self.state(pid);st['status']='conflict';states[pid]=st;continue
            self._clear_conflict(pid); self._write_user(pid,latest,merged,base_body=latest_body);states[pid]=self.state(pid)
        return states
    def state(self,prompt_id):
        latest,latest_body=self._builtin(prompt_id); path=self.user_dir/f'{prompt_id}.md'; meta,body=split_prompt(path.read_text(encoding='utf-8')) if path.exists() else ({},'')
        installed=int(meta.get('builtinVersion') or 0); base_hash=str(meta.get('baseBuiltinSha256') or '')
        modified=bool(body) and sha(body)!=base_hash
        conflict_dir=self.user_dir/'conflicts'/prompt_id
        status='conflict' if conflict_dir.exists() and any(conflict_dir.glob('*.md')) else ('update_available' if installed<latest else ('modified' if modified else 'current'))
        return {'id':prompt_id,'path':str(path),'installedVersion':installed,'builtinVersion':latest,'schemaVersion':int(meta.get('schemaVersion') or 1),'status':status,'modified':modified,'body':body,'builtinBody':latest_body}
    def list(self): return [self.state(x) for x in PROMPT_IDS]
    def get(self,prompt_id):
        if prompt_id not in PROMPT_IDS: raise KeyError(prompt_id)
        st=self.state(prompt_id); st['requiredVariables']=sorted(REQUIRED_VARS[prompt_id])
        cdir=self.user_dir/'conflicts'/prompt_id; conflicts=[]
        if cdir.exists():
            for path in sorted(cdir.glob('*.md')):
                conflicts.append({'path':str(path),'name':path.name,'content':path.read_text(encoding='utf-8')})
        st['conflicts']=conflicts
        return st
    def save(self,prompt_id,body):
        st=self.get(prompt_id); found=set(re.findall(r'\{\{\s*([A-Za-z0-9_]+)\s*\}\}',str(body)))
        missing=REQUIRED_VARS[prompt_id]-found
        if missing: raise ValueError('Missing required template variables: '+', '.join('{{'+x+'}}' for x in sorted(missing)))
        latest,latest_body=self._builtin(prompt_id); self._clear_conflict(prompt_id); self._write_user(prompt_id,latest,str(body),base_body=latest_body); return self.get(prompt_id)
    def restore(self,prompt_id):
        latest,body=self._builtin(prompt_id); self._backup_all(); self._clear_conflict(prompt_id); self._write_user(prompt_id,latest,body); return self.get(prompt_id)
    def diff(self,prompt_id):
        st=self.get(prompt_id)
        return ''.join(difflib.unified_diff(st['builtinBody'].splitlines(True),st['body'].splitlines(True),fromfile='builtin',tofile='current'))
    def render(self,prompt_id,variables):
        body=self.get(prompt_id)['body']
        for key,value in variables.items(): body=re.sub(r'\{\{\s*'+re.escape(key)+r'\s*\}\}',str(value),body)
        return body
