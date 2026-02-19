#!/bin/bash

# 获取脚本所在目录
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=================================================="
echo "   51Talk 运营分析报告 - 快速生成器"
echo "=================================================="

# 使用 start.sh 统一处理环境和启动（该脚本会自动检查依赖）
echo "🚀 正在启动..."
./start.sh --latest

RET_CODE=$?

if [ $RET_CODE -eq 0 ]; then
    echo ""
    echo "✅ 处理成功! 正在打开输出目录..."
    open output
else
    echo ""
    echo "❌ 处理失败，请检查上方错误信息。"
    # 失败时通过 read 暂停
    read -p "按任意键退出..."
fi
