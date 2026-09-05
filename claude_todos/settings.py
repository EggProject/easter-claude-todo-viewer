import copy, json, os, pathlib, tempfile

DEFAULT_AGY_MODEL='gemini-3.8-flash-high'
DEFAULT_SETTINGS={
    'version':3,
    'prompts':{'autoMigrate':True},
    'translation':{
        'provider':'agy',
        'agy':{'model':DEFAULT_AGY_MODEL,'maxConcurrency':2},
        'anthropic':{'baseUrl':'http://127.0.0.1:8000','apiKey':'','model':'','maxConcurrency':2},
    },
}

def _normalize_concurrency(value, default=2):
    try:
        value=int(value)
    except (TypeError, ValueError):
        value=default
    return max(1,min(32,value))


def _normalize_settings(settings):
    translation=settings.setdefault('translation',{})
    for provider in ('agy','anthropic'):
        cfg=translation.setdefault(provider,{})
        cfg['maxConcurrency']=_normalize_concurrency(cfg.get('maxConcurrency'),2)
    return settings


def _deep_merge(base, incoming):
    out=copy.deepcopy(base)
    for k,v in (incoming or {}).items():
        if isinstance(v,dict) and isinstance(out.get(k),dict): out[k]=_deep_merge(out[k],v)
        else: out[k]=copy.deepcopy(v)
    return out

def atomic_write(path,payload):
    path=pathlib.Path(path).expanduser(); path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix=path.name+'.',suffix='.tmp',dir=str(path.parent))
    try:
        with os.fdopen(fd,'w',encoding='utf-8') as f: json.dump(payload,f,ensure_ascii=False,indent=2); f.write('\n')
        os.replace(tmp,path)
    finally:
        try: os.unlink(tmp)
        except FileNotFoundError: pass

class AppSettingsStore:
    def __init__(self,path): self.path=pathlib.Path(path).expanduser()
    def load(self):
        raw={}
        if self.path.exists():
            try: raw=json.loads(self.path.read_text(encoding='utf-8'))
            except Exception: raw={}
        merged=_deep_merge(DEFAULT_SETTINGS,raw)
        # v2.x compatibility: translation.model was the agy model before providers existed.
        legacy_model=((raw.get('translation') or {}).get('model')) if isinstance(raw,dict) else None
        if legacy_model:
            merged.setdefault('translation',{}).setdefault('agy',{})['model']=str(legacy_model)
        # Remove the obsolete v2.x field after migrating it so v3 config stays canonical.
        merged.setdefault('translation',{}).pop('model',None)
        merged['version']=3
        merged=_normalize_settings(merged)
        if not self.path.exists() or merged!=raw: atomic_write(self.path,merged)
        return merged
    def save(self,payload):
        merged=_deep_merge(self.load(),payload or {}); merged['version']=3; merged=_normalize_settings(merged); atomic_write(self.path,merged); return merged
    @staticmethod
    def public(settings):
        out=copy.deepcopy(settings)
        anth=((out.get('translation') or {}).get('anthropic') or {})
        key=anth.pop('apiKey','')
        anth['apiKeyConfigured']=bool(key)
        return out
