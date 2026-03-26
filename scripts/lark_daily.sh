#!/usr/bin/env bash
# lark_daily.sh — Lark 每日打卡推送自动化
#
# 逻辑：
#   1. 检查 Excel 数据源目录是否有今天日期的文件
#   2. 有 → 启动后端 → 推送 4 群 → 关后端
#   3. 无 → 每 30min 轮询直到 18:00，检测到更新立即推送
#
# 用法：
#   bash scripts/lark_daily.sh           # 前台运行（检测+推送）
#   bash scripts/lark_daily.sh --force   # 跳过日期检查，强制推送
#
# Cron（每天 11:00）：
#   0 11 * * * cd "$HOME/Desktop/ref-ops-engine" && bash scripts/lark_daily.sh >> output/lark-daily.log 2>&1

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

DATA_DIR="$HOME/Desktop/转介绍中台监测指标"
BACKEND_PORT=8100
BACKEND_PID=""
TODAY=$(date +%Y%m%d)
LOG_PREFIX="[lark-daily $(date '+%H:%M:%S')]"
MAX_HOUR=18  # 18:00 后停止轮询
POLL_INTERVAL=1800  # 30 分钟

log() { echo "$LOG_PREFIX $*"; }

# ── 数据日期检测 ─────────────────────────────────────────────────────────────
check_data_today() {
    # 文件名含今天日期（格式 _YYYYMMDD_）= 数据已更新
    local count
    count=$(find "$DATA_DIR" -name "*_${TODAY}_*" -type f 2>/dev/null | head -1 | wc -l)
    [ "$count" -gt 0 ]
}

# ── 后端管理 ─────────────────────────────────────────────────────────────────
start_backend() {
    # 检查是否已运行
    if curl -sf "http://localhost:${BACKEND_PORT}/docs" >/dev/null 2>&1; then
        log "后端已运行 (port $BACKEND_PORT)"
        BACKEND_PID=""
        return 0
    fi

    log "启动后端..."
    DATA_SOURCE_DIR="$DATA_DIR" uv run uvicorn backend.main:app \
        --host 0.0.0.0 --port "$BACKEND_PORT" \
        >/dev/null 2>&1 &
    BACKEND_PID=$!

    # 等待就绪（最多 30s）
    for i in $(seq 1 30); do
        if curl -sf "http://localhost:${BACKEND_PORT}/api/checkin/summary" >/dev/null 2>&1; then
            log "后端就绪 (PID ${BACKEND_PID}, ${i}s)"
            return 0
        fi
        sleep 1
    done
    log "后端启动超时"
    return 1
}

stop_backend() {
    if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
        log "关闭后端 (PID ${BACKEND_PID})"
        kill "${BACKEND_PID}" 2>/dev/null || true
        wait "${BACKEND_PID}" 2>/dev/null || true
    fi
}

# ── 推送执行 ─────────────────────────────────────────────────────────────────
do_push() {
    log "=== 开始推送 ==="

    # 1. cc_all（CC 总览+明细+荣耀+警示）
    log "-> cc_all (CC 总览+明细)"
    uv run python scripts/lark_bot.py followup --channel cc_all --role CC --confirm 2>&1 | tail -5
    sleep 3

    # 2. lp_all（LP 总览+明细）
    log "-> lp_all (LP 总览+明细)"
    uv run python scripts/lark_bot.py followup --channel lp_all --role LP --confirm 2>&1 | tail -5
    sleep 3

    # 3. ops（CC 总览 + LP 总览）
    log "-> ops (CC+LP 总览)"
    uv run python scripts/lark_bot.py followup --channel ops --role CC --overview-only --confirm 2>&1 | tail -3
    sleep 5
    uv run python scripts/lark_bot.py followup --channel ops --role LP --overview-only --confirm 2>&1 | tail -3
    sleep 3

    # 4. cc_tl（CC 总览）
    log "-> cc_tl (CC 总览)"
    uv run python scripts/lark_bot.py followup --channel cc_tl --role CC --overview-only --confirm 2>&1 | tail -3

    log "=== 推送完成 ==="
}

# ── 主流程 ───────────────────────────────────────────────────────────────────
trap stop_backend EXIT

if [ "${1:-}" = "--force" ]; then
    log "强制模式，跳过日期检查"
    start_backend && do_push
    exit 0
fi

# 轮询循环
while true; do
    current_hour=$(date +%H)
    if [ "${current_hour}" -ge "${MAX_HOUR}" ]; then
        log "已过 ${MAX_HOUR}:00，停止轮询（今日数据未更新）"
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
