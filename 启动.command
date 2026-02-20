#!/bin/bash
# ref-ops-engine 一键启动器
cd "$(dirname "$0")"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "正在关闭服务..."
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    wait 2>/dev/null
    echo "已关闭。"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "================================================"
echo "  51Talk 泰国转介绍运营分析平台"
echo "================================================"

# ── 依赖检查 ─────────────────────────────────────

if [ ! -d "venv" ]; then
    echo "[后端] 创建虚拟环境..."
    python3 -m venv venv
fi

echo "[后端] 检查依赖..."
venv/bin/pip install -q -r backend/requirements.txt 2>/dev/null

if [ ! -d "frontend/node_modules" ]; then
    echo "[前端] 首次安装 npm 包（请稍候）..."
    (cd frontend && npm install --silent)
fi

# ── 启动后端 ──────────────────────────────────────

echo "[后端] 启动中..."
(cd backend && ../venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 2>&1) &
BACKEND_PID=$!

# 等后端就绪
for i in $(seq 1 20); do
    sleep 1
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "[后端] ✓ 就绪"
        break
    fi
done

# ── 自动触发分析（后台加载35源数据）───────────────

echo "[引擎] 加载35源数据并执行分析..."
curl -s -X POST -H "Content-Type: application/json" -d '{}' http://localhost:8000/api/analysis/run > /dev/null 2>&1 &

# ── 启动前端 ──────────────────────────────────────

echo "[前端] 启动中..."
(cd frontend && npm run dev -- --port 3000 2>&1) &
FRONTEND_PID=$!

# 等前端就绪后打开浏览器
for i in $(seq 1 30); do
    sleep 1
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "[前端] ✓ 就绪"
        echo ""
        echo "================================================"
        echo "  后端 API:  http://localhost:8000"
        echo "  运营面板:  http://localhost:3000"
        echo "  按 Ctrl+C 关闭"
        echo "================================================"
        open "http://localhost:3000"
        break
    fi
done

# 保持运行
wait
