#!/usr/bin/env bash
# Quick BI 数据源补抓 — 11:00 安全网
# 检测 DATA_SOURCE_DIR 中日期落后的数据源，仅补抓落后源
# 2026-03-31 新增：永久防线，杜绝 D2b 日期滞后问题

set -euo pipefail

PROJECT_DIR="$HOME/Desktop/ref-ops-engine"
LOG_DIR="$PROJECT_DIR/output/logs"
LOG_FILE="$LOG_DIR/quickbi_catchup_$(date +%Y%m%d).log"

mkdir -p "$LOG_DIR"

echo "━━━ Quick BI 补抓检查 $(date '+%Y-%m-%d %H:%M:%S') ━━━" >> "$LOG_FILE"

cd "$PROJECT_DIR"

# 运行补抓模式（自动检测落后源，有落后才下载）
"$HOME/.local/bin/uv" run python scripts/quickbi_fetch.py --catchup >> "$LOG_FILE" 2>&1

echo "[$(date '+%H:%M:%S')] ✓ 补抓检查完成" >> "$LOG_FILE"
