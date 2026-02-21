#!/usr/bin/env python3
"""
terminal_start.py
终端 AI 模式启动入口。

用法:
    python3 terminal_start.py

前置条件:
    1. 填写 key/anthropic.json 中的 api_key
    2. 后端服务运行中（默认 http://localhost:8000）
    3. 已安装依赖: pip3 install anthropic textual textual-plotext plotext
"""
import sys
import os

# 确保项目根目录在 path 中
ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


def _check_api_key() -> bool:
    """检查 anthropic.json 是否已填写真实 API key。"""
    import json
    key_path = os.path.join(ROOT, "key", "anthropic.json")
    if not os.path.exists(key_path):
        print(f"[错误] 找不到 {key_path}")
        print("请创建 key/anthropic.json 并填入 Anthropic API key。")
        return False
    with open(key_path) as f:
        data = json.load(f)
    key = data.get("api_key", "")
    if not key or key == "YOUR_ANTHROPIC_API_KEY_HERE":
        print("[错误] key/anthropic.json 中的 api_key 尚未填写。")
        print("请将 YOUR_ANTHROPIC_API_KEY_HERE 替换为真实的 Anthropic API key。")
        return False
    return True


def main() -> None:
    if not _check_api_key():
        sys.exit(1)

    try:
        from terminal.app import TerminalAIApp
    except ImportError as e:
        print(f"[错误] 无法导入 terminal 模块: {e}")
        print("请确认已安装依赖: pip3 install anthropic textual textual-plotext plotext")
        sys.exit(1)

    app = TerminalAIApp()
    app.run()


if __name__ == "__main__":
    main()
