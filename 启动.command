#!/bin/bash
# ref-ops-engine 一键启动器
cd "$(dirname "$0")"

# ── ANSI 颜色 ─────────────────────────────────────
C_BLUE='\033[1;34m'
C_GREEN='\033[0;32m'
C_RED='\033[0;31m'
C_YELLOW='\033[1;33m'
C_RESET='\033[0m'

ok()   { echo -e "${C_GREEN}[✓]${C_RESET} $*"; }
fail() { echo -e "${C_RED}[✗]${C_RESET} $*"; }
info() { echo -e "${C_BLUE}[→]${C_RESET} $*"; }
warn() { echo -e "${C_YELLOW}[!]${C_RESET} $*"; }

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    warn "正在关闭服务..."
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    wait 2>/dev/null
    ok "已关闭。"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo -e "${C_BLUE}================================================${C_RESET}"
echo -e "${C_BLUE}  51Talk 泰国转介绍运营分析平台${C_RESET}"
echo -e "${C_BLUE}================================================${C_RESET}"

# ── 环境检测 ──────────────────────────────────────

if ! command -v python3 &>/dev/null; then
    fail "未找到 python3，请先安装 Python 3.9+（https://python.org）"
    exit 1
fi
if ! command -v node &>/dev/null; then
    fail "未找到 node，请先安装 Node.js 18+（https://nodejs.org）"
    exit 1
fi
ok "环境检测通过（$(python3 --version), $(node --version)）"

# ── 端口自动清理（仅杀本项目进程）──────────────────

kill_port() {
    local port=$1
    local pids
    pids=$(lsof -ti tcp:"$port" 2>/dev/null)
    if [ -n "$pids" ]; then
        warn "端口 $port 被占用，正在清理..."
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 0.5
        ok "端口 $port 已释放"
    fi
}
kill_port 8000
kill_port 3000

# ── 依赖检查 ─────────────────────────────────────

if [ ! -d "venv" ]; then
    info "创建 Python 虚拟环境..."
    python3 -m venv venv
fi

info "检查后端依赖..."
venv/bin/pip install -q -r backend/requirements.txt 2>/dev/null

if [ ! -d "frontend/node_modules" ]; then
    info "首次安装 npm 包（请稍候）..."
    (cd frontend && npm install --silent)
fi

# ── 启动后端 ──────────────────────────────────────

info "启动后端服务..."
(cd backend && ../venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 2>&1) &
BACKEND_PID=$!

# 等后端就绪
BACKEND_READY=0
for i in $(seq 1 20); do
    sleep 1
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        ok "后端就绪（http://localhost:8000）"
        BACKEND_READY=1
        break
    fi
done
if [ "$BACKEND_READY" -eq 0 ]; then
    fail "后端启动超时，请检查 backend/ 日志"
    exit 1
fi

# ── 自动触发分析（前台执行，显示结果）──────────────

info "加载 35 源数据并执行分析引擎..."
ANALYSIS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST -H "Content-Type: application/json" -d '{}' \
    http://localhost:8000/api/analysis/run)
if [ "$ANALYSIS_STATUS" = "200" ] || [ "$ANALYSIS_STATUS" = "202" ]; then
    ok "分析引擎加载完成（HTTP $ANALYSIS_STATUS）"
else
    warn "分析引擎响应异常（HTTP $ANALYSIS_STATUS），面板数据可能不完整"
fi

# ── 启动前端 ──────────────────────────────────────

info "启动前端服务..."
(cd frontend && npm run dev -- --port 3000 2>&1) &
FRONTEND_PID=$!

# 等前端就绪后打开浏览器
FRONTEND_READY=0
for i in $(seq 1 30); do
    sleep 1
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        ok "前端就绪（http://localhost:3000）"
        FRONTEND_READY=1
        break
    fi
done

if [ "$FRONTEND_READY" -eq 1 ]; then
    echo ""
    echo -e "${C_BLUE}================================================${C_RESET}"
    echo -e "  后端 API:  ${C_GREEN}http://localhost:8000${C_RESET}"
    echo -e "  运营总览:  ${C_GREEN}http://localhost:3000/ops/dashboard${C_RESET}"
    echo -e "  按 ${C_YELLOW}Ctrl+C${C_RESET} 关闭所有服务"
    echo -e "${C_BLUE}================================================${C_RESET}"
    open "http://localhost:3000/ops/dashboard"
else
    fail "前端启动超时，请检查 frontend/ 日志"
fi

# 保持运行
wait
