#!/usr/bin/env bash
# Quick BI 定时取数 — launchd 包装脚本
# 每天泰国 10:00 执行（StartCalendarInterval 不补跑错过的任务）
# 补跑机制在「一键启动.command」中：检测今日文件缺失时自动拉取
# 失败时钉钉告警

set -euo pipefail

PROJECT_DIR="$HOME/Desktop/ref-ops-engine"
LOG_DIR="$PROJECT_DIR/output/logs"
LOG_FILE="$LOG_DIR/quickbi_fetch_$(date +%Y%m%d).log"
NOTIFY_CONFIG="$PROJECT_DIR/config/quickbi_notify.json"
LOCK_FILE="${TMPDIR:-/private/tmp/claude-501}/quickbi_fetch.lock"

mkdir -p "$LOG_DIR"

# ── 防重复执行（同一天只跑一次）──
TODAY=$(date +%Y%m%d)
DONE_FILE="${TMPDIR:-/private/tmp/claude-501}/quickbi_done_${TODAY}"
if [ -f "$DONE_FILE" ]; then
    echo "[$(date '+%H:%M:%S')] 今天已执行过，跳过" >> "$LOG_FILE"
    exit 0
fi

# ── 进程锁 ──
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        echo "[$(date '+%H:%M:%S')] 另一个实例运行中 (PID=$PID)，跳过" >> "$LOG_FILE"
        exit 0
    fi
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# ── 执行取数 ──
echo "━━━ Quick BI 自动取数 $(date '+%Y-%m-%d %H:%M:%S') ━━━" >> "$LOG_FILE"

cd "$PROJECT_DIR"

if "$HOME/.local/bin/uv" run python scripts/quickbi_fetch.py --headless >> "$LOG_FILE" 2>&1; then
    echo "[$(date '+%H:%M:%S')] ✓ 取数成功" >> "$LOG_FILE"

    # 取数成功后自动写入 T-1 日快照
    echo "[$(date '+%H:%M:%S')] 写入日快照..." >> "$LOG_FILE"
    "$HOME/.local/bin/uv" run python -m scripts.snapshot_daily >> "$LOG_FILE" 2>&1 || \
        echo "[$(date '+%H:%M:%S')] ⚠ 日快照写入失败（非致命）" >> "$LOG_FILE"

    touch "$DONE_FILE"

    # 成功通知（可选，默认不发）
    # _send_dingtalk "✅ Quick BI 自动取数成功（8/8 表格）"
else
    EXIT_CODE=$?
    echo "[$(date '+%H:%M:%S')] ✗ 取数失败 (exit=$EXIT_CODE)" >> "$LOG_FILE"

    # ── 钉钉告警 ──
    if [ -f "$NOTIFY_CONFIG" ]; then
        WEBHOOK=$(python3 -c "import json; print(json.load(open('$NOTIFY_CONFIG'))['dingtalk_webhook'])" 2>/dev/null || echo "")
        SECRET=$(python3 -c "import json; print(json.load(open('$NOTIFY_CONFIG'))['dingtalk_secret'])" 2>/dev/null || echo "")

        if [ -n "$WEBHOOK" ] && [ -n "$SECRET" ]; then
            # 计算签名
            TIMESTAMP=$(python3 -c "import time; print(int(time.time() * 1000))")
            SIGN=$(python3 -c "
import hmac, hashlib, base64, urllib.parse
ts = '$TIMESTAMP'
secret = '$SECRET'
string_to_sign = f'{ts}\n{secret}'
hmac_code = hmac.new(
    secret.encode('utf-8'),
    string_to_sign.encode('utf-8'),
    digestmod=hashlib.sha256
).digest()
sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
print(sign)
")
            SIGNED_URL="${WEBHOOK}&timestamp=${TIMESTAMP}&sign=${SIGN}"

            # 取最后 5 行日志作为错误摘要
            TAIL_LOG=$(tail -5 "$LOG_FILE" | sed 's/"/\\"/g' | tr '\n' '|' | sed 's/|/\\n/g')

            curl -sf -X POST "$SIGNED_URL" \
                -H 'Content-Type: application/json' \
                -d "{
                    \"msgtype\": \"markdown\",
                    \"markdown\": {
                        \"title\": \"Quick BI 取数失败\",
                        \"text\": \"### ⚠️ Quick BI 自动取数失败\n\n**时间**: $(date '+%Y-%m-%d %H:%M')\n\n**可能原因**: accessTicket 已过期\n\n**操作**: 请到 Settings → BI 数据源 更新链接\n\n**日志摘要**:\n\`\`\`\n${TAIL_LOG}\n\`\`\`\"
                    }
                }" >> "$LOG_FILE" 2>&1

            echo "[$(date '+%H:%M:%S')] 钉钉告警已发送" >> "$LOG_FILE"
        fi
    fi
fi
