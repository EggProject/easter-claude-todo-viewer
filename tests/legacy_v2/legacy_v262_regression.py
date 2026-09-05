import contextlib
import importlib.util
import io
import json
import os
import pathlib
import sys
import tempfile
import threading
import time
import unittest
import urllib.request

PKG = pathlib.Path(__file__).resolve().parents[1]
SERVER = PKG / 'server.py'


def load_server():
    name = f'claude_todos_server_v261_{time.time_ns()}'
    spec = importlib.util.spec_from_file_location(name, SERVER)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


class TTYBuffer(io.StringIO):
    def isatty(self):
        return True


class V262RegressionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        self.home = self.root / 'home'
        self.claude = self.home / '.claude'
        self.cache_root = self.home / '.claude-todos' / 'cache'
        self.log_root = self.home / '.claude-todos' / 'logs'
        self.project = self.root / 'project'
        self.project.mkdir(parents=True)
        self.session = 'd1165f25-2740-45b4-8ae7-b35a1cb64c46'
        self.store = self.session
        self.task_dir = self.claude / 'tasks' / self.store
        self.task_dir.mkdir(parents=True)
        self.transcript = self.claude / 'projects' / '-tmp-project' / f'{self.session}.jsonl'
        self.transcript.parent.mkdir(parents=True)
        self.transcript.write_text(json.dumps({'cwd': str(self.project)}) + '\n')

    def tearDown(self):
        self.tmp.cleanup()

    def write_task(self, task_id='17', subject='Translate title', description='Translate description'):
        data = {
            'id': str(task_id), 'subject': subject, 'description': description,
            'status': 'pending', 'activeForm': 'Working', 'owner': '',
            'blockedBy': [], 'blocks': [], 'metadata': {}
        }
        path = self.task_dir / f'{task_id}.json'
        path.write_text(json.dumps(data), encoding='utf-8')
        return path

    def make_slow_stream_agy(self, delay=0.8):
        bin_dir = self.root / 'bin'
        bin_dir.mkdir(exist_ok=True)
        script = bin_dir / 'agy'
        call_log = self.root / 'agy-calls.jsonl'
        script.write_text(r'''#!/usr/bin/env python3
import json, os, sys, time
args=sys.argv[1:]
prompt=args[args.index('-p')+1] if '-p' in args else ''
with open(os.environ['FAKE_AGY_LOG'],'a',encoding='utf-8') as f:
    f.write(json.dumps({'args':args,'prompt':prompt})+'\n')
print(json.dumps({'event':'init','conversation_id':'fake-conv','init':{'model':'gemini-3.8-flash-high','permission_mode':'request-review','cwd':'/tmp','tools':[]}}), flush=True)
print(json.dumps({'event':'step_update','step_update':{'conversation_id':'fake-conv','step_index':0,'step_type':'agent_response','state':'ACTIVE'}}), flush=True)
print('fake diagnostic from agy', file=sys.stderr, flush=True)
time.sleep(float(os.environ.get('FAKE_AGY_DELAY','0.8')))
if 'independent translation fidelity validator' in prompt:
    out={'valid': True, 'issues': []}
else:
    src=json.loads(prompt.split('Source JSON:\n',1)[1])
    out={'title':'HU: '+src['title'], 'description':'HU: '+src['description']}
print(json.dumps({'event':'step_update','step_update':{'conversation_id':'fake-conv','step_index':1,'step_type':'agent_response','state':'DONE','duration_seconds':float(os.environ.get('FAKE_AGY_DELAY','0.8'))}}), flush=True)
print(json.dumps({'event':'result','result':{'conversation_id':'fake-conv','status':'SUCCESS','structured_output':out,'response':json.dumps(out,ensure_ascii=False),'duration_seconds':float(os.environ.get('FAKE_AGY_DELAY','0.8')),'usage':{'input_tokens':1,'output_tokens':1,'thinking_tokens':0,'cache_read_tokens':0,'total_tokens':2}}}), flush=True)
''', encoding='utf-8')
        script.chmod(0o755)
        return script, call_log

    def config(self, mod, agy_path='agy', log_file=False, log_output=False, log_stream=None):
        # v2.6.2 contract: logging configuration belongs to the server config.
        return mod.Config(
            session_id=self.session,
            transcript=str(self.transcript),
            project_cwd=str(self.project),
            task_root=self.claude / 'tasks',
            candidate_ids=[self.store],
            initial_status='all', initial_sort='dependency', version='2.6.2',
            cache_root=self.cache_root, ui_dir=PKG / 'ui', agy_bin=agy_path,
            no_open=True, port=0,
            log_file=log_file, log_output=log_output, log_root=self.log_root,
            log_stream=log_stream,
        )

    def test_language_http_request_returns_while_translation_runs_in_background(self):
        self.write_task()
        agy, call_log = self.make_slow_stream_agy()
        os.environ['FAKE_AGY_LOG'] = str(call_log)
        os.environ['FAKE_AGY_DELAY'] = '0.8'
        mod = load_server()
        cfg = self.config(mod, agy_path=str(agy))
        runtime = mod.DashboardRuntime(cfg)
        server = mod.QuietThreadingHTTPServer(('127.0.0.1', 0), mod.make_handler(runtime))
        server.daemon_threads = True
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}'
        try:
            req = urllib.request.Request(
                base + '/api/language',
                data=json.dumps({'language':'hu'}).encode(),
                headers={'Content-Type':'application/json'}, method='POST')
            started = time.monotonic()
            state = json.loads(urllib.request.urlopen(req, timeout=2).read())
            elapsed = time.monotonic() - started
            self.assertLess(elapsed, 0.55, 'language POST must not wait for translator + validator')
            self.assertEqual(state['globalLanguage'], 'en')
            self.assertTrue(state['globalTranslationPending'])

            deadline = time.monotonic() + 5
            translated = None
            while time.monotonic() < deadline:
                translated = json.loads(urllib.request.urlopen(base + '/api/state', timeout=2).read())
                if translated['tasks'][0]['subject'].startswith('HU: '):
                    break
                time.sleep(0.1)
            self.assertIsNotNone(translated)
            self.assertEqual(translated['tasks'][0]['subject'], 'HU: Translate title')
            self.assertFalse(translated['tasks'][0]['translationPending'])
            self.assertEqual(len(call_log.read_text().splitlines()), 2)
        finally:
            runtime.close()
            server.shutdown(); server.server_close()
            os.environ.pop('FAKE_AGY_LOG', None)
            os.environ.pop('FAKE_AGY_DELAY', None)

    def test_task_language_request_is_also_backgrounded_and_marks_only_that_task_pending(self):
        self.write_task(task_id='17', subject='Task A', description='Desc A')
        self.write_task(task_id='18', subject='Task B', description='Desc B')
        agy, call_log = self.make_slow_stream_agy()
        os.environ['FAKE_AGY_LOG'] = str(call_log)
        os.environ['FAKE_AGY_DELAY'] = '0.5'
        mod = load_server(); cfg = self.config(mod, agy_path=str(agy)); runtime = mod.DashboardRuntime(cfg)
        try:
            state = runtime.request_task_language(f'{self.store}:17', 'hu')
            a = next(t for t in state['tasks'] if t['id']=='17')
            b = next(t for t in state['tasks'] if t['id']=='18')
            self.assertTrue(a['translationPending'])
            self.assertFalse(b['translationPending'])
            self.assertEqual(b['effectiveLanguage'], 'en')
            deadline=time.monotonic()+4
            while time.monotonic()<deadline:
                st=runtime.store.api_state(); a=next(t for t in st['tasks'] if t['id']=='17')
                if a['subject'].startswith('HU: '): break
                time.sleep(.05)
            self.assertEqual(a['subject'], 'HU: Task A')
            self.assertEqual(len(call_log.read_text().splitlines()), 2)
        finally:
            runtime.close(); os.environ.pop('FAKE_AGY_LOG',None); os.environ.pop('FAKE_AGY_DELAY',None)


    def test_logger_uses_icons_and_color_only_for_terminal_output(self):
        mod = load_server()
        stream = TTYBuffer()
        cfg = self.config(mod, log_file=True, log_output=True, log_stream=stream)
        logger = mod.AppLogger(cfg)
        logger.info('🌍', 'TRANSLATE', 'task #17 translator started \x1b[31mforeign-color\x1b[0m')
        logger.warning('⚠️', 'VALIDATE', 'candidate rejected')
        logger.close()

        output = stream.getvalue()
        self.assertIn('🌍', output)
        self.assertIn('⚠️', output)
        self.assertIn('\x1b[', output, 'terminal output should use ANSI color')

        files = list(self.log_root.glob(f'{self.session}/*.log'))
        self.assertEqual(len(files), 1)
        text = files[0].read_text(encoding='utf-8')
        self.assertIn('🌍', text)
        self.assertIn('⚠️', text)
        self.assertNotIn('\x1b[', text, 'file logs must never contain ANSI control codes')

    def test_logging_is_opt_in_and_file_directory_is_not_created_without_file_flag(self):
        mod = load_server()
        cfg = self.config(mod, log_file=False, log_output=False)
        logger = mod.AppLogger(cfg)
        logger.info('🧠', 'CACHE', 'cache hit')
        logger.close()
        self.assertFalse(self.log_root.exists())

    def test_frontend_replaces_global_and_task_language_switch_with_spinner_while_pending(self):
        js = (PKG / 'ui' / 'app.js').read_text(encoding='utf-8')
        css = (PKG / 'ui' / 'styles.css').read_text(encoding='utf-8')
        self.assertIn('lang-spinner', js)
        self.assertIn('translationPending', js)
        self.assertIn('globalTranslationPending', js)
        self.assertIn('.lang-spinner', css)
        self.assertIn('@keyframes', css)

    def test_shell_help_exposes_independent_log_file_and_log_output_flags(self):
        sh = (PKG / 'claude-todos.sh').read_text(encoding='utf-8')
        self.assertIn('--log-file', sh)
        self.assertIn('--log-output', sh)
        self.assertIn('CLAUDE_TODOS_LOG_FILE', sh)
        self.assertIn('CLAUDE_TODOS_LOG_OUTPUT', sh)
        self.assertIn('CLAUDE_TODOS_LOG_ROOT', sh)


if __name__ == '__main__':
    unittest.main(verbosity=2)
