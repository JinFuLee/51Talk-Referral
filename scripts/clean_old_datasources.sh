#!/usr/bin/env bash
# ==============================================================================
# 数据源自动更新清理脚本
# 同一类型数据源保留最新一份，删除旧版本 + 清理孤儿缓存
# ==============================================================================
#
# 文件名模式: 转介绍中台监测指标_{类型名}_{YYYYMMDD}_{HH}_{MM}_{SS}.xlsx
# 逻辑: 按类型名分组 → 每组保留文件名最大的（最新）→ 删除其余
# 不限制新类型进入，自动适配任何新增数据源
#
# 用法:
#   bash scripts/clean_old_datasources.sh              # 默认目录
#   bash scripts/clean_old_datasources.sh /path/to/dir # 指定目录
#   bash scripts/clean_old_datasources.sh --dry-run    # 只预览不删除
#
# 审计日志: output/datasource-cleanup.log（每次运行追加完整快照）
# ==============================================================================

set -euo pipefail

# ── 参数解析 ─────────────────────────────────────────────────────────────────
DRY_RUN=false
DATA_DIR=""

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        *)         DATA_DIR="$arg" ;;
    esac
done

# 默认数据源目录
if [ -z "$DATA_DIR" ]; then
    DATA_DIR="${DATA_SOURCE_DIR:-$HOME/Desktop/转介绍中台监测指标}"
fi

# ── 审计日志 ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="${SCRIPT_DIR}/output/datasource-cleanup.log"
mkdir -p "$(dirname "$LOG_FILE")"

log_audit() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# ── 颜色 ─────────────────────────────────────────────────────────────────────
C_GREEN='\033[1;32m'
C_RED='\033[1;31m'
C_YELLOW='\033[1;33m'
C_BLUE='\033[1;36m'
C_RESET='\033[0m'

ok()   { printf "${C_GREEN}[OK]${C_RESET} %s\n" "$*"; }
warn() { printf "${C_YELLOW}[WARN]${C_RESET} %s\n" "$*"; }
info() { printf "${C_BLUE}[INFO]${C_RESET} %s\n" "$*"; }
del()  { printf "${C_RED}[DEL]${C_RESET} %s\n" "$*"; }

# ── 前置检查 ─────────────────────────────────────────────────────────────────
if [ ! -d "$DATA_DIR" ]; then
    warn "数据源目录不存在: $DATA_DIR"
    exit 1
fi

info "扫描目录: $DATA_DIR"
$DRY_RUN && info "-- DRY RUN 模式，不会实际删除 --"

# ── 审计: 记录运行前快照 ─────────────────────────────────────────────────────
log_audit "========== 清理开始 =========="
log_audit "目录: $DATA_DIR"
log_audit "模式: $($DRY_RUN && echo 'DRY-RUN' || echo 'EXECUTE')"
log_audit "--- 运行前文件清单 ---"
shopt -s nullglob
for f in "$DATA_DIR"/*.xlsx; do
    fname=$(basename "$f")
    [[ "$fname" == .* ]] && continue
    fsize=$(stat -f%z "$f" 2>/dev/null || echo "?")
    log_audit "  BEFORE: $fname (${fsize} bytes)"
done
shopt -u nullglob

# ── 核心逻辑: 按类型分组，保留最新 ──────────────────────────────────────────
declare -A type_files
total_files=0
old_files=0

shopt -s nullglob
for f in "$DATA_DIR"/*.xlsx; do
    fname=$(basename "$f")
    [[ "$fname" == .* ]] && continue

    type_name=$(echo "$fname" | sed -E 's/_[0-9]{8}_[0-9]{1,2}_[0-9]{1,2}_[0-9]{1,2}\.xlsx$//')

    if [ "$type_name" = "$fname" ]; then
        warn "非标准命名，跳过: $fname"
        log_audit "  SKIP(非标准): $fname"
        continue
    fi

    total_files=$((total_files + 1))
    log_audit "  PARSED: $fname → type=[$type_name]"

    if [ -z "${type_files[$type_name]+_}" ]; then
        type_files[$type_name]="$fname"
    else
        type_files[$type_name]="${type_files[$type_name]}"$'\n'"$fname"
    fi
done
shopt -u nullglob

# ── 分组处理 ─────────────────────────────────────────────────────────────────
deleted_count=0
kept_count=0

log_audit "--- 分组决策 ---"

for type_name in "${!type_files[@]}"; do
    sorted_files=$(echo "${type_files[$type_name]}" | sort -r)
    latest=$(echo "$sorted_files" | head -1)
    others=$(echo "$sorted_files" | tail -n +2)

    kept_count=$((kept_count + 1))

    if [ -z "$others" ]; then
        log_audit "  KEEP(唯一): $latest"
        continue
    fi

    ok "保留最新: $latest"
    log_audit "  KEEP(最新): $latest"

    while IFS= read -r old_file; do
        [ -z "$old_file" ] && continue
        old_files=$((old_files + 1))
        deleted_count=$((deleted_count + 1))
        if $DRY_RUN; then
            del "[dry-run] 将删除: $old_file"
            log_audit "  DELETE(dry-run): $old_file"
        else
            rm -f "$DATA_DIR/$old_file"
            del "已删除旧版: $old_file"
            log_audit "  DELETE(执行): $old_file"
        fi
    done <<< "$others"
done

# ── 清理孤儿缓存 ─────────────────────────────────────────────────────────────
CACHE_DIR="$DATA_DIR/.cache"
cache_cleaned=0
if [ -d "$CACHE_DIR" ]; then
    if [ "$deleted_count" -gt 0 ]; then
        if $DRY_RUN; then
            info "[dry-run] 将清理 .cache/ 中的过期缓存"
            log_audit "  CACHE(dry-run): 将清理"
        else
            rm -f "$CACHE_DIR"/*.parquet
            cache_cleaned=1
            ok "已清理 .cache/ 缓存（下次启动自动重建）"
            log_audit "  CACHE(执行): 已清理全部 parquet"
        fi
    fi
fi

# ── 审计: 记录运行后快照 ─────────────────────────────────────────────────────
log_audit "--- 运行后文件清单 ---"
shopt -s nullglob
after_count=0
for f in "$DATA_DIR"/*.xlsx; do
    fname=$(basename "$f")
    [[ "$fname" == .* ]] && continue
    fsize=$(stat -f%z "$f" 2>/dev/null || echo "?")
    log_audit "  AFTER: $fname (${fsize} bytes)"
    after_count=$((after_count + 1))
done
shopt -u nullglob
log_audit "结果: 扫描 ${total_files} → 保留 ${after_count} → 删除 ${deleted_count}"
log_audit "========== 清理结束 =========="
log_audit ""

# ── 摘要 ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${C_BLUE}────────────────────────────────────────${C_RESET}"
info "扫描文件: $total_files 个"
info "数据源类型: ${#type_files[@]} 种"
if [ "$deleted_count" -gt 0 ]; then
    del "清理旧版: $deleted_count 个"
    [ "$cache_cleaned" -eq 1 ] && ok "缓存已重置"
else
    ok "所有数据源均为最新，无需清理"
fi
info "审计日志: $LOG_FILE"
echo -e "${C_BLUE}────────────────────────────────────────${C_RESET}"
