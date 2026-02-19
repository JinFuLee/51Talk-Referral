#!/usr/bin/env python3
"""一键启动 51Talk 转介绍运营分析面板"""
import subprocess
import sys
import os
import webbrowser
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


def check_deps():
    """检查并安装依赖"""
    try:
        import streamlit
    except ImportError:
        print("正在安装依赖...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(BASE_DIR / "requirements.txt")])


def main():
    check_deps()
    port = 8501
    url = f"http://localhost:{port}"

    # 延迟打开浏览器
    def open_browser():
        time.sleep(2)
        webbrowser.open(url)

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    # 启动 Streamlit
    subprocess.run([
        sys.executable, "-m", "streamlit", "run", str(BASE_DIR / "app.py"),
        "--server.port", str(port),
        "--server.headless", "true"
    ])


if __name__ == "__main__":
    main()
