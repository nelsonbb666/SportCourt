"""Servidor local para ver SportCourt SIN subirlo a ningún hosting.
Uso:  python3 serve_local.py   (desde frontend/)
Abrir: http://localhost:8080"""
import http.server, socketserver, os

PORT = 8080
DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST, **kwargs)
    def do_GET(self):
        path = self.path.split("?")[0].lstrip("/") or "index.html"
        if not os.path.exists(os.path.join(DIST, path)):
            self.path = "/index.html"
        return super().do_GET()
    def log_message(self, *args):
        pass

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

with Server(("", PORT), SPAHandler) as httpd:
    print(f"SportCourt (local) -> http://localhost:{PORT}")
    httpd.serve_forever()
