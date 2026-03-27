#!/usr/bin/env bash
# dingtalk_daily_auto.sh — 钉钉每日推送自动化（与 lark_daily.sh 同逻辑）
#
# 11:05 launchd 触发（比 Lark 晚 5 分钟，避免后端并发）
# 检查 Excel 数据日期 → 有则推送 → 无则 30min 轮询到 18:00

set -euo pipefail

export PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH"

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

DATA_DIR="$HOME/Desktop/转介绍中台监测指标"
BACKEND_PORT=8100
BACKEND_PID=""
TODAY=$(date +%Y%m%d)
LOG_PREFIX="[dingtalk-daily $(date '+%H:%M:%S')]"
MAX_HOUR=18
MIN_HOUR=9
POLL_INTERVAL=1800

log() { echo "$LOG_PREFIX $*"; }

check_data_today() {
    local count
    count=$(find "$DATA_DIR" -name "*_${TODAY}_*" -type f 2>/dev/null | head -1 | wc -l)
    [ "$count" -gt 0 ]
}

start_backend() {
    if curl -sf "http://localhost:${BACKEND_PORT}/api/checkin/summary" >/dev/null 2>&1; then
        log "后端已运行"
        BACKEND_PID=""
        return 0
    fi
    log "启动后端..."
    DATA_SOURCE_DIR="$DATA_DIR" uv run uvicorn backend.main:app \
        --host 0.0.0.0 --port "$BACKEND_PORT" \
        >/dev/null 2>&1 &
    BACKEND_PID=$!
    for i in $(seq 1 30); do
        if curl -sf "http://localhost:${BACKEND_PORT}/api/checkin/summary" >/dev/null 2>&1; then
            log "后端就绪 (${i}s)"
            return 0
        fi
        sleep 1
    done
    log "后端启动超时"
    return 1
}

stop_backend() {
    if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
        log "关闭后端"
        kill "${BACKEND_PID}" 2>/dev/null || true
        wait "${BACKEND_PID}" 2>/dev/null || true
    fi
}

do_push() {
    log "=== 钉钉推送开始 ==="
    uv run python scripts/dingtalk_daily.py --engine --confirm 2>&1 | tail -20
    log "=== 钉钉推送完成 ==="
}

trap stop_backend EXIT

if [ "${1:-}" = "--force" ]; then
    log "强制模式"
    start_backend && do_push
    exit 0
fi

while true; do
    current_hour=$(date +%H)
    if [ "${current_hour}" -lt "${MIN_HOUR}" ]; then
        log "未到 ${MIN_HOUR}:00，等待..."
        sleep "${POLL_INTERVAL}"
        continue
    fi
    if [ "${current_hour}" -ge "${MAX_HOUR}" ]; then
        log "已过 ${MAX_HOUR}:00，停止"
        exit 0
    fi
    if check_data_today; then
        log "检测到今日数据 (${TODAY})"
        start_backend && do_push
        exit 0
    else
        log "未检测到今日数据，${POLL_INTERVAL}s 后重试..."
        sleep "${POLL_INTERVAL}"
    fi
done
