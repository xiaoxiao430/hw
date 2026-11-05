#!/usr/bin/env python3
"""厚外成长离线预览：仅使用 Python 3 标准库，绑定本机并自动选择空闲端口。"""
import argparse
import functools
import http.server
from pathlib import Path
import sys
import threading
import webbrowser


ROOT = Path(__file__).resolve().parent
DIST = ROOT
REQUIRED = [
    "index.html", "说明.html", "styles.css", "family.css", "staff.css",
    "learning-guide.html", "teaching.css", "teaching.js", "handbook.css", "handbook.js", "learning-data.js", "learning-store.js",
    "docs/内容说明.pdf", "docs/初中学习手册.pdf", "docs/高中学习手册.pdf",
    "data.js", "store.js", "app.js", "family.js", "staff.js", "boot.js",
    "houwai-icons.js", "houwai-icons.css", "assets/houwai-seal.png",
    "assets/MicrosoftYaHei.woff2", "assets/MicrosoftYaHei-Bold.woff2",
]


def check_package():
    missing = [name for name in REQUIRED if not (DIST / name).is_file()]
    if missing:
        print("交付文件不完整，请保留整个目录后再试：\n" + "\n".join(missing), file=sys.stderr)
        return False
    for name in ("assets/MicrosoftYaHei.woff2", "assets/MicrosoftYaHei-Bold.woff2"):
        with (DIST / name).open("rb") as stream:
            if stream.read(4) != b"wOF2":
                print("微软雅黑字体文件无效：" + name + "。请修复字体，不得静默替换。", file=sys.stderr)
                return False
    return True


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # 浏览器会请求许多本地资源；保持终端只显示启动与错误信息。
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def copyfile(self, source, outputfile):
        # 页面切换可能取消尚未传完的字体请求，不把正常取消显示成服务故障。
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


class PreviewServer(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def create_server(preferred_port):
    handler = functools.partial(PreviewHandler, directory=str(DIST))
    # 默认优先使用固定端口，便于保留同一浏览器的本地状态；占用时自动换一个。
    candidates = [preferred_port] if preferred_port else list(range(8765, 8796)) + [0]
    for port in candidates:
        try:
            return PreviewServer(("127.0.0.1", port), handler)
        except OSError as error:
            if preferred_port:
                raise OSError("指定端口不可用：" + str(port)) from error
    raise OSError("无法创建本地预览服务。")


def main():
    parser = argparse.ArgumentParser(description="厚外成长初高中 Demo 离线预览")
    parser.add_argument("--no-browser", action="store_true", help="仅启动服务，不自动打开浏览器")
    parser.add_argument("--port", type=int, default=0, help="指定端口；默认自动选择")
    parser.add_argument("--check", action="store_true", help="只检查网页和字体文件完整性")
    args = parser.parse_args()
    if args.port < 0 or args.port > 65535:
        parser.error("端口必须在 0—65535 之间。")
    if not check_package():
        return 1
    if args.check:
        print("检查通过：网页、脚本、图标与微软雅黑 WOFF2 文件完整。")
        return 0
    try:
        server = create_server(args.port)
    except OSError as error:
        print("启动失败：" + str(error), file=sys.stderr)
        return 1
    url = "http://127.0.0.1:" + str(server.server_address[1]) + "/index.html"
    print("厚外成长 · 初高中 Demo 已启动", flush=True)
    print("浏览器入口：" + url, flush=True)
    print("使用说明：" + url.replace("index.html", "%E8%AF%B4%E6%98%8E.html"), flush=True)
    print("仅本机可访问；可断网使用；全部为合成数据。", flush=True)
    print("保持此窗口打开。按 Control + C 停止。", flush=True)
    if not args.no_browser:
        timer = threading.Timer(0.3, lambda: webbrowser.open(url, new=2))
        timer.daemon = True
        timer.start()
    try:
        server.serve_forever(poll_interval=0.3)
    except KeyboardInterrupt:
        print("\n本地预览已停止。")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
