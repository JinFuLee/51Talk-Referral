#!/bin/bash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"

# 检查是否安装了依赖
if [ ! -d "$PROJECT_ROOT/venv" ]; then
    echo "Creating virtual environment..."
    source "$PROJECT_ROOT/venv/bin/activate"
    echo "Installing dependencies..."
    pip install -r "$PROJECT_ROOT/requirements.txt"
else
    source "$PROJECT_ROOT/venv/bin/activate"
    # Always check for new dependencies, it's fast if satisfied
    echo "Checking dependencies..."
    pip install -r "$PROJECT_ROOT/requirements.txt"
fi

# 设置 PYTHONPATH 以便直接运行 src 下的脚本
export PYTHONPATH="$PROJECT_ROOT/src:$PYTHONPATH"

# 运行主程序
python "$PROJECT_ROOT/src/main.py" "$@"
