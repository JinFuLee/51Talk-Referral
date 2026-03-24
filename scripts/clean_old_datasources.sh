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

# ── 核心逻辑: 按类型分组，保留最新 ──────────────────────────────────────────
# 提取类型名: 去掉前缀 "转介绍中台监测指标_" 和时间戳后缀 "_YYYYMMDD_HH_MM_SS.xlsx"
# 时间戳模式: _数字8位_数字2位_数字2位_数字2位.xlsx

declare -A type_files  # type_name -> "file1\nfile2\n..." (按文件名排序)
total_files=0
old_files=0

shopt -s nullglob
for f in "$DATA_DIR"/*.xlsx; do
    fname=$(basename "$f")
    # 跳过隐藏文件
    [[ "$fname" == .* ]] && continue

    # 提取类型名: 去掉时间戳后缀 _YYYYMMDD_HH_MM_SS.xlsx
    # 模式: 最后 _8数字_2数字_2数字_2数字.xlsx
    type_name=$(echo "$fname" | sed -E 's/_[0-9]{8}_[0-9]{1,2}_[0-9]{1,2}_[0-9]{1,2}\.xlsx$//')

    if [ "$type_name" = "$fname" ]; then
        # 没有匹配时间戳模式，可能是非标准命名，跳过
        warn "非标准命名，跳过: $fname"
        continue
    fi

    total_files=$((total_files + 1))

    # 追加到类型分组（换行分隔）
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

for type_name in "${!type_files[@]}"; do
    # 按文件名排序（时间戳在文件名中，字典序 = 时间序）
    sorted_files=$(echo "${type_files[$type_name]}" | sort -r)
    latest=$(echo "$sorted_files" | head -1)
    others=$(echo "$sorted_files" | tail -n +2)

    kept_count=$((kept_count + 1))

    if [ -z "$others" ]; then
        # 只有一个文件，无需清理
        continue
    fi

    # 显示保留的最新文件
    ok "保留最新: $latest"

    # 删除旧版本
    while IFS= read -r old_file; do
        [ -z "$old_file" ] && continue
        old_files=$((old_files + 1))
        deleted_count=$((deleted_count + 1))
        if $DRY_RUN; then
            del "[dry-run] 将删除: $old_file"
        else
            rm -f "$DATA_DIR/$old_file"
            del "已删除旧版: $old_file"
        fi
    done <<< "$others"
done

# ── 清理孤儿缓存 ─────────────────────────────────────────────────────────────
CACHE_DIR="$DATA_DIR/.cache"
cache_cleaned=0
if [ -d "$CACHE_DIR" ]; then
    shopt -s nullglob
    for cache_file in "$CACHE_DIR"/*.parquet; do
        # Parquet 缓存的 key 基于源文件路径的 MD5
        # 源文件被删后缓存自然失效，下次加载会重建
        # 简单策略: 删除所有缓存（下次启动自动重建，耗时 <5s）
        :
    done
    shopt -u nullglob

    if [ "$deleted_count" -gt 0 ]; then
        if $DRY_RUN; then
            info "[dry-run] 将清理 .cache/ 中的过期缓存"
        else
            rm -f "$CACHE_DIR"/*.parquet
            cache_cleaned=1
            ok "已清理 .cache/ 缓存（下次启动自动重建）"
        fi
    fi
fi

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
echo -e "${C_BLUE}────────────────────────────────────────${C_RESET}"
