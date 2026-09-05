try:
    from .base import ProviderResult
except ImportError:
    import importlib.util, pathlib
    _bp=pathlib.Path(__file__).with_name('base.py')
    _spec=importlib.util.spec_from_file_location('_claude_todos_provider_base', _bp)
    _mod=importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_mod)
    ProviderResult=_mod.ProviderResult

class AgyProvider:
    name='agy'
    def __init__(self, agy_bin, model, runner):
        self.agy_bin=str(agy_bin or 'agy');self.model=str(model or '');self.runner=runner
    def run(self, system_prompt, user_prompt, schema, job_handle=None, phase='translator', task_ref='', agent_spec=None):
        structured,meta=self.runner(
            self.agy_bin,user_prompt,schema,phase=phase,task_ref=task_ref,model=self.model,
            job_handle=job_handle,return_meta=True,agent_spec=agent_spec,
        )
        return ProviderResult(
            structured=structured,
            raw_response=str(meta.get('rawResponse') or ''),
            exact_request=dict(meta.get('exactRequest') or {}),
            provider=self.name,
            model=self.model,
            duration_seconds=float(meta.get('durationSeconds') or 0),
            usage=dict(meta.get('usage') or {}),
            remote_id=str(meta.get('conversationId') or ''),
            metadata={k:v for k,v in meta.items() if k not in {'structuredOutput','rawResponse','exactRequest','durationSeconds','usage','conversationId','model','provider'}},
        )
