#!/usr/bin/env python3
"""P0 static preview, loopback only. No production API proxy."""
import argparse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, unquote

REDIRECTS = {'/index.html':'/', '/shop-chat.html':'/shop-chat/', '/b-chat.html':'/b-chat/', '/biz-chat.html':'/biz-chat/'}
for channel in ('shop-chat','b-chat','biz-chat','brand'):
    REDIRECTS['/'+channel+'/index.html']='/'+channel+'/'

class Preview(SimpleHTTPRequestHandler):
    def translate_path(self,path):
        for prefix,replacement in (('/frontend/','/assets/frontend/'),('/img/','/assets/img/')):
            if path.startswith(prefix):path=replacement+path[len(prefix):];break
        resolved=Path(super().translate_path(path)).resolve()
        root=Path(self.directory).resolve()
        if root not in resolved.parents and root!=resolved:return str(root/'__not_found__')
        return str(resolved)
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()
    def send_head(self):
        u=urlsplit(self.path)
        if any(part.startswith('.') or '.bak' in part or '.backup-' in part for part in unquote(u.path).split('/') if part):
            self.send_error(404);return None
        if u.path in REDIRECTS:
            self.send_response(302);self.send_header('Location',REDIRECTS[u.path]+('?' + u.query if u.query else ''));self.send_header('Content-Length','0');self.end_headers();return None
        if u.path=='/_lxdiag':self.send_error(410,'Diagnostic endpoint retired');return None
        if u.path=='/api' or u.path.startswith(('/api/','/api-stream-test/')):
            self.send_error(503,'Static preview: backend is not connected');return None
        return super().send_head()
    def list_directory(self,path):
        self.send_error(404,'Directory listing disabled');return None

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]/'public/leaip0')
    parser.add_argument('--port',type=int,default=8080)
    args=parser.parse_args();root=args.root.resolve()
    if not (root/'index.html').is_file():parser.error('root must contain index.html')
    handler=lambda *a,**kw:Preview(*a,directory=str(root),**kw)
    server=ThreadingHTTPServer(('127.0.0.1',args.port),handler)
    print(f'P0 preview: http://127.0.0.1:{args.port}/ (static files only)',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
