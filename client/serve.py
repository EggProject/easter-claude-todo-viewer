#!/usr/bin/env python3
import argparse,mimetypes,pathlib,threading,webbrowser
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import unquote,urlparse

class ClientServer(ThreadingHTTPServer):
    daemon_threads=True
    def __init__(self,address,root,api_base):
        self.root=pathlib.Path(root).resolve(); self.api_base=str(api_base).rstrip('/'); super().__init__(address,ClientHandler)

class ClientHandler(BaseHTTPRequestHandler):
    def log_message(self,fmt,*args): return
    def _send(self,status,ctype,data):
        self.send_response(status); self.send_header('Content-Type',ctype); self.send_header('Content-Length',str(len(data))); self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff'); self.end_headers(); self.wfile.write(data)
    def do_GET(self):
        path=unquote(urlparse(self.path).path)
        rel=path.lstrip('/')
        candidate=(self.server.root/rel).resolve() if rel else self.server.root/'index.html'
        try: candidate.relative_to(self.server.root)
        except ValueError: self._send(403,'text/plain; charset=utf-8',b'Forbidden'); return
        if candidate.is_file() and candidate.name!='index.html':
            ctype=mimetypes.guess_type(candidate.name)[0] or 'application/octet-stream'; self._send(200,ctype,candidate.read_bytes()); return
        index=self.server.root/'index.html'
        try: html=index.read_text(encoding='utf-8').replace('__CLAUDE_TODOS_API_BASE__',self.server.api_base)
        except OSError: self._send(500,'text/plain; charset=utf-8',b'Client index missing'); return
        self._send(200,'text/html; charset=utf-8',html.encode('utf-8'))

def make_server(host,port,root,api_base): return ClientServer((host,int(port)),root,api_base)

def main(argv=None):
    p=argparse.ArgumentParser(description='Claude Todos v4 React client server'); p.add_argument('--port',type=int,default=8766);p.add_argument('--server-url',default='http://127.0.0.1:8765');p.add_argument('--no-open',action='store_true');args=p.parse_args(argv)
    root=pathlib.Path(__file__).resolve().parent; httpd=make_server('127.0.0.1',args.port,root,args.server_url); url=f'http://127.0.0.1:{httpd.server_port}'
    print(f'\n🖥️  Claude Todos Client v4.0.0\n🌐 {url}\n🔌 API: {args.server_url}\n⌨️  Ctrl+C to stop\n',flush=True)
    if not args.no_open: threading.Timer(.2,lambda:webbrowser.open(url)).start()
    try: httpd.serve_forever(poll_interval=.25)
    except KeyboardInterrupt: pass
    finally: httpd.server_close(); print('\n👋 Claude Todos Client stopped.')
if __name__=='__main__': main()
