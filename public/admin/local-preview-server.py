#!/usr/bin/env python3
"""Portable local preview server for the Leaibot admin workbench.

This server is intentionally self-contained so the admin folder can be sent to
another computer and previewed without the original backend. It maps /admin/*
to the current folder and opens the workbench demo URL with mocked API data.
"""

from __future__ import annotations

import argparse
import contextlib
import http.server
import mimetypes
import posixpath
import socket
import socketserver
import sys
import urllib.parse
import webbrowser
from pathlib import Path
from typing import Optional


ADMIN_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = ADMIN_DIR.parent if ADMIN_DIR.name == "admin" else ADMIN_DIR


def find_port(preferred: int, host: str) -> int:
    for port in range(preferred, preferred + 30):
        with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind((host, port))
            except OSError:
                continue
            return port
    raise RuntimeError(f"No available local port from {preferred} to {preferred + 29}")


def get_lan_ip() -> Optional[str]:
    try:
        with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_DGRAM)) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        try:
            ip = socket.gethostbyname(socket.gethostname())
            return ip if ip and not ip.startswith("127.") else None
        except OSError:
            return None


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "LeaibotPreview/1.0"

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def redirect_to_workbench(self) -> None:
        self.send_response(302)
        self.send_header("Location", "/admin/workbench.html?demo=1")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path in ("", "/", "/admin", "/admin/"):
            self.redirect_to_workbench()
            return
        super().do_GET()

    def do_HEAD(self) -> None:
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path in ("", "/", "/admin", "/admin/"):
            self.redirect_to_workbench()
            return
        super().do_HEAD()

    def translate_path(self, path: str) -> str:
        parsed = urllib.parse.urlsplit(path)
        url_path = posixpath.normpath(urllib.parse.unquote(parsed.path))

        if url_path.startswith("/admin/"):
            rel = url_path[len("/admin/") :]
            base = ADMIN_DIR
        elif url_path == "/favicon.svg":
            candidate = PUBLIC_DIR / "favicon.svg"
            return str(candidate if candidate.exists() else ADMIN_DIR / "assets" / "favicon.ico")
        elif url_path.startswith("/"):
            rel = url_path.lstrip("/")
            base = PUBLIC_DIR if PUBLIC_DIR.exists() else ADMIN_DIR
        else:
            rel = url_path
            base = ADMIN_DIR

        parts = [p for p in rel.split("/") if p and p not in (".", "..")]
        return str(base.joinpath(*parts))

    def guess_type(self, path: str) -> str:
        if path.endswith(".js"):
            return "application/javascript; charset=utf-8"
        if path.endswith(".css"):
            return "text/css; charset=utf-8"
        if path.endswith(".html"):
            return "text/html; charset=utf-8"
        return super().guess_type(path)

    def log_message(self, fmt: str, *args: object) -> None:
        sys.stdout.write("[preview] " + (fmt % args) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Start Leaibot admin local preview.")
    parser.add_argument("--port", type=int, default=4173, help="Preferred local port. Default: 4173")
    parser.add_argument("--host", default="0.0.0.0", help="Bind host. Default: 0.0.0.0 for LAN preview")
    parser.add_argument("--no-open", action="store_true", help="Do not open the browser automatically")
    args = parser.parse_args()

    mimetypes.add_type("application/javascript", ".js")
    mimetypes.add_type("text/css", ".css")

    port = find_port(args.port, args.host)
    direct_url = f"http://127.0.0.1:{port}/admin/workbench.html?demo=1"
    lan_ip = get_lan_ip()
    lan_url = f"http://{lan_ip}:{port}/admin/workbench.html?demo=1" if lan_ip and args.host in ("0.0.0.0", "::") else None

    with socketserver.TCPServer((args.host, port), PreviewHandler) as httpd:
        print("")
        print("乐享 AI 工作台本地预览已启动")
        print(f"本机预览: {direct_url}")
        if lan_url:
            print(f"局域网预览: {lan_url}")
            print("同一 Wi-Fi / 局域网设备可访问上面的局域网地址。")
        print("关闭此窗口或按 Ctrl+C 即可停止预览服务。")
        print("")
        if not args.no_open:
            webbrowser.open(direct_url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n预览服务已停止。")


if __name__ == "__main__":
    main()
