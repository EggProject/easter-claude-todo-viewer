#!/usr/bin/env python3
import argparse
import pathlib
import signal
import sys

from .http_api import make_server
from .multi_runtime import DaemonConfig, MultiSessionRuntime


def parser():
    p=argparse.ArgumentParser(description='Claude Todos v4 multi-session backend daemon')
    p.add_argument('--port',type=int,default=int(__import__('os').environ.get('CLAUDE_TODOS_SERVER_PORT','8765')))
    p.add_argument('--log-file',action='store_true'); p.add_argument('--log-output',action='store_true')
    p.add_argument('--client-origin',action='append',default=[])
    return p


def main(argv=None):
    args=parser().parse_args(argv)
    os=__import__('os'); home=pathlib.Path(os.environ.get('CLAUDE_CONFIG_DIR',str(pathlib.Path.home()/'.claude'))).expanduser()
    app_root=pathlib.Path(os.environ.get('CLAUDE_TODOS_HOME',str(pathlib.Path.home()/'.claude-todos'))).expanduser()
    origins=args.client_origin or [os.environ.get('CLAUDE_TODOS_CLIENT_ORIGIN','http://127.0.0.1:8766'),'http://localhost:8766']
    cfg=DaemonConfig(claude_home=home,cache_root=app_root/'cache',settings_file=app_root/'config.json',app_state_file=app_root/'app-state.json',log_root=app_root/'logs',agy_bin=os.environ.get('CLAUDE_TODOS_AGY_BIN','agy'),version='4.1.0',log_file=args.log_file,log_output=args.log_output,client_origins=list(dict.fromkeys(origins)),port=args.port)
    runtime=MultiSessionRuntime(cfg,start_background=True); httpd=make_server(runtime,args.port)
    print(f'\n🚀 Claude Todos Server v{cfg.version}'); print(f'🌐 http://127.0.0.1:{httpd.server_port}'); state=runtime.app_state(); print(f"🧵 Current: {state.get('currentSessionId') or 'none'}"); print(f"👀 Watched: {len(state.get('watchedSessionIds') or [])}"); print('⌨️  Ctrl+C to stop\n',flush=True)
    try: httpd.serve_forever(poll_interval=.25)
    except KeyboardInterrupt: pass
    finally: runtime.close(); httpd.server_close(); print('\n👋 Claude Todos Server stopped.')

if __name__=='__main__': main()
