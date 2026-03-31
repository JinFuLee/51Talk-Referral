#!/usr/bin/env bash
# 口径守卫每日定时校验（launchd 触发，Quick BI 取数后 30 分钟）
# 用法: bash scripts/caliber-guard-daily.sh [API_URL]
set -euo pipefail

API_URL="${1:-http://localhost:8100}"
LOG_DIR="$HOME/Desktop/ref-ops-engine/output/logs"
mkdir -p "$LOG_DIR"

# 先触发 cc-performance API（层 2/3 校验在此执行）
curl -sf "$API_URL/api/cc-performance" > /dev/null 2>&1 || true

# 读取口径守卫状态
STATUS=$(curl -sf "$API_URL/api/caliber-guard/status" 2>/dev/null || echo "")
if [ -z "$STATUS" ]; then
    echo "[$(date '+%H:%M:%S')] ✗ caliber-guard API 不可达" >> "$LOG_DIR/caliber-guard.log"
    exit 1
fi

OVERALL=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['overall_status'])" 2>/dev/null || echo "unknown")
echo "[$(date '+%H:%M:%S')] caliber-guard: $OVERALL" >> "$LOG_DIR/caliber-guard.log"

if [ "$OVERALL" = "critical" ]; then
    echo "[$(date '+%H:%M:%S')] P0 告警已触发，请检查 output/data-caliber-audit.jsonl" >> "$LOG_DIR/caliber-guard.log"
    exit 2
fi

echo "[$(date '+%H:%M:%S')] 口径守卫检查完成: $OVERALL"
