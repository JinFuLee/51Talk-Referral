#!/usr/bin/env bash
# archive_month.sh — 月末数据归档（原子写入）
#
# 用法:
#   bash scripts/archive_month.sh 202603          # 归档指定月份
#   bash scripts/archive_month.sh --auto          # 自动检测上月并归档
#   bash scripts/archive_month.sh --list          # 列出已归档月份
#
# 数据流: input/*.xlsx → data/archives/YYYYMM/ (atomic: tmp→rename)
# 触发: quickbi_fetch.py 月份翻页 / launchd 每月2日 / 手动

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INPUT_DIR="$PROJECT_ROOT/input"
ARCHIVE_BASE="$PROJECT_ROOT/data/archives"

# 需要归档的文件模式
ARCHIVE_PATTERNS=(
    "转介绍中台检测_结果数据.xlsx"
    "转介绍中台检测_围场过程数据_byCC.xlsx"
    "转介绍中台检测_围场过程数据_bySS.xlsx"
    "转介绍中台检测_围场过程数据_byLP.xlsx"
    "区域汇_围场过程数据_byCC副本.xlsx"
    "转介绍中台检测_明细.xlsx"
    "已付费学员转介绍围场明细.xlsx"
    "转介绍中台监测_高潜学员.xlsx"
)

list_archives() {
    echo "━━━ 已归档月份 ━━━"
    if [ ! -d "$ARCHIVE_BASE" ]; then
        echo "  (无归档)"
        return
    fi
    for d in "$ARCHIVE_BASE"/*/; do
        [ -d "$d" ] || continue
        month=$(basename "$d")
        [[ "$month" =~ ^[0-9]{6}$ ]] || continue
        meta="$d/_meta.json"
        if [ -f "$meta" ]; then
            file_count=$(python3 -c "import json; print(json.load(open('$meta')).get('file_count', '?'))" 2>/dev/null || echo "?")
            archived_at=$(python3 -c "import json; print(json.load(open('$meta')).get('archived_at', '?')[:10])" 2>/dev/null || echo "?")
            echo "  $month — ${file_count} 文件，归档于 $archived_at"
        else
            xlsx_count=$(find "$d" -name "*.xlsx" -maxdepth 1 2>/dev/null | grep -c . || echo 0)
            echo "  $month — ${xlsx_count} 文件（无 _meta.json）"
        fi
    done
}

detect_auto_month() {
    # 自动检测：当前月份的上一个月
    python3 -c "
from datetime import date, timedelta
today = date.today()
first_of_month = today.replace(day=1)
last_month = first_of_month - timedelta(days=1)
print(last_month.strftime('%Y%m'))
"
}

archive_month() {
    local MONTH="$1"
    local ARCHIVE_DIR="$ARCHIVE_BASE/$MONTH"
    local TMP_DIR="$ARCHIVE_BASE/.tmp_${MONTH}_$$"

    echo "━━━ 归档 $MONTH ━━━"

    # 检查是否已归档
    if [ -d "$ARCHIVE_DIR" ] && [ -f "$ARCHIVE_DIR/_meta.json" ]; then
        echo "⚠ $MONTH 已有归档。用 --force 覆盖。"
        if [ "${2:-}" != "--force" ]; then
            return 1
        fi
    fi

    # 清理残留 tmp
    rm -rf "$ARCHIVE_BASE"/.tmp_${MONTH}_* 2>/dev/null

    # 1. 写入临时目录
    mkdir -p "$TMP_DIR"
    local copied=0
    for f in "${ARCHIVE_PATTERNS[@]}"; do
        src="$INPUT_DIR/$f"
        if [ -f "$src" ]; then
            cp "$src" "$TMP_DIR/" || { echo "✗ 复制失败: $f"; rm -rf "$TMP_DIR"; return 1; }
            copied=$((copied + 1))
            echo "  ✓ $f"
        else
            echo "  ⚠ 跳过（不存在）: $f"
        fi
    done

    # 2. 完整性检查
    if [ "$copied" -lt 6 ]; then
        echo "✗ 归档不完整（${copied}/8 文件，最少需 6），中止"
        rm -rf "$TMP_DIR"
        return 1
    fi

    # 3. 生成 _meta.json
    local DATA_DATE
    DATA_DATE=$(python3 -c "
import openpyxl, sys
try:
    wb = openpyxl.load_workbook('$TMP_DIR/转介绍中台检测_结果数据.xlsx', read_only=True, data_only=True)
    ws = wb.active
    # Row 2, Col 1 = 统计日期 value
    val = ws.cell(row=2, column=1).value
    print(val if val else 'unknown')
    wb.close()
except Exception as e:
    print('unknown', file=sys.stderr)
    print('unknown')
" 2>/dev/null)

    cat > "$TMP_DIR/_meta.json" << EOF
{
  "month": "$MONTH",
  "archived_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "source": "archive_month_sh",
  "data_date": "$DATA_DATE",
  "file_count": $copied,
  "completeness": {}
}
EOF

    # 4. Atomic rename
    if [ -d "$ARCHIVE_DIR" ]; then
        mv "$ARCHIVE_DIR" "$ARCHIVE_BASE/.old_${MONTH}_$$"
    fi
    mv "$TMP_DIR" "$ARCHIVE_DIR"
    rm -rf "$ARCHIVE_BASE/.old_${MONTH}_$$" 2>/dev/null

    echo ""
    echo "✓ $MONTH 归档完成: ${copied} 文件 + _meta.json"
    echo "  路径: $ARCHIVE_DIR"
}

# ── 入口 ────────────────────────────────────────────────────
case "${1:-}" in
    --list|list)
        list_archives
        ;;
    --auto|auto)
        MONTH=$(detect_auto_month)
        echo "自动检测: 归档 $MONTH"
        archive_month "$MONTH" "${2:-}"
        ;;
    [0-9][0-9][0-9][0-9][0-9][0-9])
        archive_month "$1" "${2:-}"
        ;;
    *)
        echo "用法: $0 {YYYYMM|--auto|--list} [--force]"
        echo "  202603    — 归档指定月份"
        echo "  --auto    — 自动归档上月"
        echo "  --list    — 列出已归档月份"
        exit 1
        ;;
esac
