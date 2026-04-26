#!/usr/bin/env python3
"""
本地静态测试页启动器（不依赖 Next / npm install）。

输入：可选 host/port 参数。
输出：启动 static_web_test/index.html 的 HTTP 服务。
边界：仅用于本地交互验证，不替代真实 web/api 流程。
"""

from __future__ import annotations

import argparse
import http.server
import os
import pathlib
import socket
import socketserver
import sys


def detect_local_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


def port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex((host, port)) == 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Start static web test page server")
    parser.add_argument("--host", default="0.0.0.0", help="Bind host, default: 0.0.0.0")
    parser.add_argument("--port", type=int, default=4173, help="Bind port, default: 4173")
    args = parser.parse_args()

    repo_root = pathlib.Path(__file__).resolve().parents[1]
    web_dir = repo_root / "static_web_test"
    index_file = web_dir / "index.html"

    if not index_file.exists():
        print(f"❌ missing file: {index_file}", file=sys.stderr)
        return 1

    if port_in_use(args.host, args.port):
        print(f"❌ port already in use: {args.host}:{args.port}", file=sys.stderr)
        print("提示：请更换端口，例如 --port 4174", file=sys.stderr)
        return 1

    os.chdir(web_dir)
    handler = http.server.SimpleHTTPRequestHandler

    with socketserver.TCPServer((args.host, args.port), handler) as httpd:
        print("✅ static web test page is running")
        local_ip = detect_local_ip()
        print(f"   local:   http://127.0.0.1:{args.port}")
        print(f"   lan:     http://{local_ip}:{args.port}")
        print(f"   bind:    http://{args.host}:{args.port}")
        print("提示：若浏览器不在当前容器/机器，请先做端口转发，再访问转发地址。")
        print("按 Ctrl+C 退出")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已停止 static web test server")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
