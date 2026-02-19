#!/bin/bash
# 转介绍规划表 Agent 启动脚本
# 用法:
#   ./start_planning.sh          → 监控模式 (默认)
#   ./start_planning.sh --latest → 处理最新文件
#   ./start_planning.sh --once /path/to/file.xlsx → 单次处理

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"
SRC_DIR="$SCRIPT_DIR/src"

# 确保虚拟环境存在
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv "$VENV_DIR"
fi

# 激活虚拟环境
source "$VENV_DIR/bin/activate"

# 安装依赖
pip install -q openpyxl watchdog python-dotenv 2>/dev/null

# 设置 PYTHONPATH
export PYTHONPATH="$SRC_DIR:$PYTHONPATH"

# 运行
if [ $# -eq 0 ]; then
    python3 "$SRC_DIR/agents/planning_main.py" --watch --polling
else
    python3 "$SRC_DIR/agents/planning_main.py" "$@"
fi
