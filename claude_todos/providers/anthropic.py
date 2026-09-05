import http.client
import json
import time
from urllib.parse import urlparse

try:
    from .base import ProviderResult
except ImportError:
    import importlib.util, pathlib
    _bp=pathlib.Path(__file__).with_name('base.py')
    _spec=importlib.util.spec_from_file_location('_claude_todos_provider_base', _bp)
    _mod=importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_mod)
    ProviderResult=_mod.ProviderResult

class AnthropicProvider:
    name = 'anthropic'
    def __init__(self, base_url='http://127.0.0.1:8000', api_key='', model='', max_tokens=32768, timeout=300):
        self.base_url = str(base_url or 'http://127.0.0.1:8000').rstrip('/')
        self.api_key = str(api_key or '')
        self.model = str(model or '')
        self.max_tokens = int(max_tokens)
        self.timeout = float(timeout)

    def _connection(self):
        p=urlparse(self.base_url)
        if p.scheme not in ('http','https') or not p.hostname:
            raise ValueError('Anthropic-compatible base URL must be http(s)://host[:port]')
        cls=http.client.HTTPSConnection if p.scheme=='https' else http.client.HTTPConnection
        return cls(p.hostname, p.port, timeout=self.timeout), (p.path.rstrip('/') if p.path else '')

    def _headers(self):
        h={'content-type':'application/json','anthropic-version':'2023-06-01'}
        if self.api_key:
            h['x-api-key']=self.api_key
        return h

    def list_models(self):
        conn,prefix=self._connection()
        try:
            conn.request('GET', prefix+'/v1/models', headers=self._headers())
            resp=conn.getresponse(); raw=resp.read().decode('utf-8','replace')
            if resp.status//100!=2:
                raise RuntimeError(f'model discovery HTTP {resp.status}: {raw[:1000]}')
            payload=json.loads(raw)
            data=payload.get('data') if isinstance(payload,dict) else None
            out=[]
            for item in data or []:
                if isinstance(item,dict) and item.get('id'):
                    out.append({'id':str(item['id']),'label':str(item.get('display_name') or item['id'])})
            return out
        finally:
            conn.close()

    def test_connection(self):
        models=self.list_models()
        return {'ok':True,'models':models,'count':len(models)}

    @staticmethod
    def _extract_text(payload):
        parts=[]
        for block in (payload.get('content') or []) if isinstance(payload,dict) else []:
            if isinstance(block,dict) and block.get('type')=='text':
                parts.append(str(block.get('text') or ''))
        return ''.join(parts)

    @staticmethod
    def _parse_structured(text):
        text=str(text or '').strip()
        try:return json.loads(text)
        except Exception: pass
        m=None
        import re
        m=re.search(r'```(?:json)?\s*([\s\S]*?)```',text,re.I)
        if m:
            try:return json.loads(m.group(1).strip())
            except Exception:pass
        start=text.find('{'); end=text.rfind('}')
        if start>=0 and end>start:
            try:return json.loads(text[start:end+1])
            except Exception:pass
        raise RuntimeError('Anthropic-compatible response did not contain a JSON object')

    def run(self, system_prompt, user_prompt, schema, job_handle=None, phase='translator'):
        if not self.model:
            raise RuntimeError('No Anthropic-compatible model is selected')
        request={
            'model':self.model,
            'max_tokens':self.max_tokens,
            'system':system_prompt,
            'messages':[{'role':'user','content':user_prompt}],
        }
        conn,prefix=self._connection()
        if job_handle and hasattr(job_handle,'set_abort_callback'):
            job_handle.set_abort_callback(conn.close)
        started=time.monotonic()
        try:
            body=json.dumps(request,ensure_ascii=False).encode('utf-8')
            conn.request('POST',prefix+'/v1/messages',body=body,headers=self._headers())
            resp=conn.getresponse(); raw=resp.read().decode('utf-8','replace')
            if resp.status//100!=2:
                raise RuntimeError(f'Anthropic-compatible HTTP {resp.status}: {raw[:2000]}')
            payload=json.loads(raw)
            text=self._extract_text(payload)
            structured=self._parse_structured(text)
            return ProviderResult(
                structured=structured, raw_response=text, exact_request=request,
                provider=self.name, model=self.model, duration_seconds=time.monotonic()-started,
                usage=dict(payload.get('usage') or {}), remote_id=str(payload.get('id') or ''),
                metadata={'stopReason':payload.get('stop_reason'),'phase':phase,'httpStatus':resp.status},
            )
        finally:
            if job_handle and hasattr(job_handle,'clear_abort_callback'):
                job_handle.clear_abort_callback()
            conn.close()
