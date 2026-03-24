#!/bin/bash
# ==============================================================================
# Ref-Ops-Engine - 一键启动序列 v3
# ==============================================================================
cd "$(dirname "$0")" || { echo "切换目录失败，请把此脚本放到项目根目录"; exit 1; }

# ── ANSI 颜色系统 ──────────────────────────────────────────────────────────
C_BLUE='\033[1;36m'
C_GREEN='\033[1;32m'
C_RED='\033[1;31m'
C_YELLOW='\033[1;33m'
C_RESET='\033[0m'

ok()   { printf "${C_GREEN}[ OK ]${C_RESET} %s\n" "$*"; }
fail() { printf "${C_RED}[ FAIL ]${C_RESET} %s\n" "$*"; }
info() { printf "${C_BLUE}[ INFO ]${C_RESET} %s\n" "$*"; }
warn() { printf "${C_YELLOW}[ WARN ]${C_RESET} %s\n" "$*"; }

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    warn "接收到终止信号，系统正在安全下线..."
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    wait 2>/dev/null
    ok "所有常驻核心服务已安全释放。期待下次运转。"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

clear
echo -e "${C_BLUE}======================================================================${C_RESET}"
echo -e "${C_BLUE}                 51Talk 泰国转介绍大本营系统                          ${C_RESET}"
echo -e "${C_BLUE}              (Ref-Ops-Engine 一键启动 FlashUI Edition)               ${C_RESET}"
echo -e "${C_BLUE}======================================================================${C_RESET}"
echo ""

# ── 环境自检 ──────────────────────────────────────────────────────────────

info "执行系统合规性检测..."
if ! command -v node &>/dev/null; then
    fail "Node.js (18+) 不存在。请通过 Node 官网或 nvm 安装。"
    exit 1
fi
ok "运行时组件校验通过 (Node: $(node --version))"

# ── Python 环境（uv 自动管理）─────────────────────────────────────────────
if ! command -v uv &>/dev/null; then
    fail "uv 未安装。请运行: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi
ok "现代工具链就绪 (uv $(uv --version | cut -d' ' -f2))"

info "同步 Python 依赖树 (uv sync)..."
if ! uv sync --quiet 2>/dev/null; then
    warn "依赖同步存在异常，但脚本将尝试继续。"
fi
ok "Python 依赖同步完成"

# ── 依赖树分析与重组 ──────────────────────────────────────────────────────

info "校验本地界面层资产包 (node_modules)..."
if [ ! -d "frontend/node_modules" ]; then
    warn "初次部署，正在构建 pnpm 组件链（将耗时数分钟）..."
    (cd frontend && pnpm install --silent)
    ok "前端资产包构建完成"
fi

# ── 端口抢占与清理 ────────────────────────────────────────────────────────

kill_port() {
    local port=$1
    local pids
    pids=$(lsof -ti tcp:"$port" 2>/dev/null)
    if [ -n "$pids" ]; then
        warn "端口 $port 被残留进程占用，正在执行清理协议..."
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 0.5
        ok "端口 $port 重置成功"
    fi
}
kill_port 8100
kill_port 3100

echo -e "${C_BLUE}----------------------------------------------------------------------${C_RESET}"

# ── 日志存储配置 ──────────────────────────────────────────────────────────

LOG_DIR="logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKEND_LOG="${LOG_DIR}/backend_${TIMESTAMP}.log"
FRONTEND_LOG="${LOG_DIR}/frontend_${TIMESTAMP}.log"

# 清理旧日志（保留最近 5 组）
ls -t "${LOG_DIR}"/backend_*.log 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null
ls -t "${LOG_DIR}"/frontend_*.log 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null

info "系统启动日志将双向持久化至: ${LOG_DIR}/"

# ── 数据源清理已改为手动触发 ──────────────────────────────────────────────
# 手动运行: bash scripts/clean_old_datasources.sh
# 或预览:   bash scripts/clean_old_datasources.sh --dry-run

# ── 唤醒逻辑模块 ──────────────────────────────────────────────────────────

info "引燃数据中间件 (Backend/FastAPI)..."
(DATA_SOURCE_DIR="$HOME/Desktop/转介绍中台监测指标" uv run python -m uvicorn backend.main:app --host 0.0.0.0 --port 8100 --loop asyncio --log-level warning > "$BACKEND_LOG" 2>&1) &
BACKEND_PID=$!

# 等待后端就绪信号
BACKEND_READY=0
for ((i=1; i<=20; i++)); do
    sleep 1
    if curl -s http://localhost:8100/api/health > /dev/null 2>&1; then
        ok "API 隧道建立完毕 (http://localhost:8100)"
        BACKEND_READY=1
        break
    fi
done

if [ "$BACKEND_READY" -eq 0 ]; then
    fail "中间件唤醒超时跳段，后端未能及时响应，请人工排查（参考: $BACKEND_LOG）"
    exit 1
fi

info "向中央处理器下达批处理分析指令..."
ANALYSIS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST -H "Content-Type: application/json" -d '{}' \
    http://localhost:8100/api/analysis/run)
if [ "$ANALYSIS_STATUS" = "200" ] || [ "$ANALYSIS_STATUS" = "202" ]; then
    ok "洞察引擎状态码: [$ANALYSIS_STATUS]。分析运算准备就绪。"
else
    warn "洞察引擎报告异常状态码: [$ANALYSIS_STATUS]。非致命错误可能导致部分分析不准。"
fi

# ── 拉起视图层 ────────────────────────────────────────────────────────────

info "唤醒流体视角引擎 (Frontend/Next.js UI)..."
(cd frontend && pnpm dev --port 3100 > "../$FRONTEND_LOG" 2>&1) &
FRONTEND_PID=$!

FRONTEND_READY=0
for ((i=1; i<=30; i++)); do
    sleep 1.5
    if curl -s http://localhost:3100 > /dev/null 2>&1; then
        ok "流体视角层编译通过并就绪 (http://localhost:3100)"
        FRONTEND_READY=1
        break
    fi
done

if [ "$FRONTEND_READY" -eq 1 ]; then
    echo ""
    echo -e "${C_BLUE}======================================================================${C_RESET}"
    echo -e "  节点矩阵已全部上线，您可以自由查阅并利用系统特性。"
    echo -e "  访问控制台      => ${C_GREEN}http://localhost:3100/ops/dashboard${C_RESET}"
    echo -e "  体验汇报模式    => ${C_GREEN}点击页面右上角 [汇报沉浸模式]${C_RESET}"
    echo -e "  安全下线指令    => 随时在终端键入 ${C_YELLOW}[ Ctrl + C ]${C_RESET} 销毁此会话簇"
    echo -e "${C_BLUE}======================================================================${C_RESET}"

    open "http://localhost:3100/ops/dashboard"
else
    fail "渲染引擎编译严重超时，请手动打开 localhost:3100 观察错误日志。"
fi

# 阻塞主线程以保持服务存活
wait
