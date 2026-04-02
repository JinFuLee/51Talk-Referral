#!/usr/bin/env bash
# switch_data_month.sh — 切换 input/ 数据月份（3 月备份 ↔ 当前）
#
# 用法:
#   bash scripts/switch_data_month.sh march    # 切换到 3 月数据
#   bash scripts/switch_data_month.sh current  # 恢复当前（4 月）数据
#   bash scripts/switch_data_month.sh status   # 查看当前数据状态
#
# 原理:
#   1. 将当前 input/ 文件保存为 .current_* 前缀
#   2. 将 .backup_20260402_* 文件（3 月 30 日数据）复制为正常文件名
#   3. 清除 parquet 缓存，强制后端重新加载
#   4. D2 围场明细当前已是 3/31 数据，不需要切换

set -euo pipefail

INPUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/input"
CACHE_DIR="$INPUT_DIR/.cache"
BACKUP_PREFIX=".backup_20260402_"
CURRENT_PREFIX=".current_"

# 需要切换的文件名（D2 围场明细不切换，它已是 3/31 数据）
SWITCHABLE_FILES=(
    "转介绍中台检测_结果数据.xlsx"
    "转介绍中台检测_围场过程数据_byCC.xlsx"
    "转介绍中台检测_围场过程数据_bySS.xlsx"
    "转介绍中台检测_围场过程数据_byLP.xlsx"
    "区域汇_围场过程数据_byCC副本.xlsx"
    "转介绍中台检测_明细.xlsx"
    "转介绍中台监测_高潜学员.xlsx"
)

clear_cache() {
    if [ -d "$CACHE_DIR" ]; then
        rm -rf "$CACHE_DIR"
        echo "✓ Parquet 缓存已清除"
    fi
}

show_status() {
    echo "━━━ 数据文件状态 ━━━"
    for f in "${SWITCHABLE_FILES[@]}"; do
        filepath="$INPUT_DIR/$f"
        if [ -f "$filepath" ]; then
            # 读取第一行的日期戳
            date_stamp=$(python3 -c "
import openpyxl
wb = openpyxl.load_workbook('$filepath', read_only=True, data_only=True)
ws = wb.active
val = ws.cell(row=1, column=1).value
print(val if val else 'N/A')
wb.close()
" 2>/dev/null || echo "N/A")
            echo "  $f → 日期: $date_stamp"
        else
            echo "  $f → ✗ 不存在"
        fi
    done
    # D2 单独显示
    d2="$INPUT_DIR/已付费学员转介绍围场明细.xlsx"
    if [ -f "$d2" ]; then
        echo "  已付费学员转介绍围场明细.xlsx → (不切换, 已是 3/31)"
    fi
    # 检查是否有 .current_ 备份
    current_count=$(find "$INPUT_DIR" -maxdepth 1 -name ".current_*" 2>/dev/null | wc -l | tr -d ' ')
    echo ""
    if [ "$current_count" -gt 0 ]; then
        echo "  状态: 🟡 已切换到历史月份（$current_count 个 .current_ 备份存在）"
    else
        echo "  状态: 🟢 当前月份数据"
    fi
}

switch_to_march() {
    echo "━━━ 切换到 3 月数据 ━━━"

    # 检查是否已切换
    if [ -f "$INPUT_DIR/${CURRENT_PREFIX}${SWITCHABLE_FILES[0]}" ]; then
        echo "⚠ 已经切换到历史月份，先恢复再切换"
        switch_to_current
    fi

    local switched=0
    for f in "${SWITCHABLE_FILES[@]}"; do
        current="$INPUT_DIR/$f"
        backup="$INPUT_DIR/${BACKUP_PREFIX}$f"
        saved="$INPUT_DIR/${CURRENT_PREFIX}$f"

        if [ ! -f "$backup" ]; then
            echo "  ⚠ 备份不存在: $backup"
            continue
        fi

        # 保存当前文件
        if [ -f "$current" ]; then
            mv "$current" "$saved"
        fi

        # 复制备份为正式文件
        cp "$backup" "$current"
        switched=$((switched + 1))
        echo "  ✓ $f → 3 月数据"
    done

    clear_cache
    echo ""
    echo "✓ 已切换 $switched 个文件到 3 月数据（截至 3/30）"
    echo "  D2 围场明细保持不变（已是 3/31）"
    echo "  重启后端即可在网站查看 3 月数据"
}

switch_to_current() {
    echo "━━━ 恢复当前月份数据 ━━━"

    local restored=0
    for f in "${SWITCHABLE_FILES[@]}"; do
        current="$INPUT_DIR/$f"
        saved="$INPUT_DIR/${CURRENT_PREFIX}$f"

        if [ ! -f "$saved" ]; then
            continue
        fi

        # 删除 3 月副本，恢复当前
        rm -f "$current"
        mv "$saved" "$current"
        restored=$((restored + 1))
        echo "  ✓ $f → 恢复当前数据"
    done

    clear_cache
    echo ""
    if [ "$restored" -gt 0 ]; then
        echo "✓ 已恢复 $restored 个文件到当前月份"
    else
        echo "✓ 已在当前月份，无需恢复"
    fi
}

# ── 主入口 ──────────────────────────────────────────────────
case "${1:-status}" in
    march|3月|202603)
        switch_to_march
        ;;
    current|restore|当前|202604)
        switch_to_current
        ;;
    status|状态)
        show_status
        ;;
    *)
        echo "用法: $0 {march|current|status}"
        echo "  march   — 切换到 3 月数据"
        echo "  current — 恢复当前（4 月）数据"
        echo "  status  — 查看当前状态"
        exit 1
        ;;
esac
