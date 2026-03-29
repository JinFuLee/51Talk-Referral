#!/usr/bin/env bash
# check-dimension-compliance.sh — 全维度框架合规检测
# 用途: MK 自验 / CI / QA 终验
# 3 类检测: 直接 useSWR / 缺 parse_filters / 类型 drift
# 退出码: 0=全部通过, 1=有违规

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$PROJECT_ROOT/frontend"
BACKEND="$PROJECT_ROOT/backend"
violations=0

echo "=== 全维度框架合规检测 ==="
echo ""

# ── 检测 1: 直接 useSWR（应使用 useFilteredSWR）────────────────────────

echo "▶ [1/3] 检测直接 useSWR 调用..."

# 排除列表: hook 定义文件 / store / 不需要 filter 的纯 UI 组件
EXCLUDE_PATTERN="use-filtered-swr|use-compare-data|config-store|stores/|node_modules|\.test\.|\.spec\."

# 在页面文件和组件文件中搜索直接 useSWR 调用
direct_swr_files=$(grep -rl "useSWR[<(]" "$FRONTEND/app" "$FRONTEND/components" 2>/dev/null \
  | grep -Ev "$EXCLUDE_PATTERN" \
  | grep -v "GlobalFilterBar\|UnifiedFilterBar" \
  || true)

if [ -n "$direct_swr_files" ]; then
  count=$(echo "$direct_swr_files" | wc -l | tr -d ' ')
  echo "  ✗ 发现 $count 个文件直接使用 useSWR（应迁移到 useFilteredSWR）:"
  echo "$direct_swr_files" | head -20 | while read -r f; do
    rel="${f#"$PROJECT_ROOT/"}"
    echo "    - $rel"
  done
  if [ "$count" -gt 20 ]; then
    echo "    ... 还有 $((count - 20)) 个文件"
  fi
  violations=$((violations + count))
else
  echo "  ✓ 无直接 useSWR 调用"
fi

echo ""

# ── 检测 2: 后端 API 缺 parse_filters ──────────────────────────────────

echo "▶ [2/3] 检测后端 API 缺 parse_filters..."

# 不需要 filter 的系统端点
EXCLUDE_API="health\.py|system\.py|dependencies\.py|__init__\.py|utils\.py|filter_options\.py|access_control\.py|config\.py|notifications\.py|knowledge\.py"

missing_filter_files=""
for api_file in "$BACKEND/api/"*.py; do
  filename=$(basename "$api_file")

  # 跳过系统端点
  if echo "$filename" | grep -qE "$EXCLUDE_API"; then
    continue
  fi

  # 检查是否有路由定义
  has_routes=$(grep -cE "@router\.(get|post|put|delete|patch)" "$api_file" 2>/dev/null || true)
  if [ "$has_routes" -eq 0 ]; then
    continue
  fi

  # 检查是否使用了 parse_filters
  has_filter=$(grep -c "parse_filters" "$api_file" 2>/dev/null || true)
  if [ "$has_filter" -eq 0 ]; then
    missing_filter_files="$missing_filter_files\n    - backend/api/$filename ($has_routes 个路由)"
  fi
done

if [ -n "$missing_filter_files" ]; then
  count=$(echo -e "$missing_filter_files" | grep -c "backend/api" || true)
  echo "  ✗ 发现 $count 个 API 文件缺少 parse_filters:"
  echo -e "$missing_filter_files"
  violations=$((violations + count))
else
  echo "  ✓ 全部 API 端点已接入 parse_filters"
fi

echo ""

# ── 检测 3: 前后端类型 drift ──────────────────────────────────────────

echo "▶ [3/3] 检测前后端类型 drift..."

TS_FILE="$FRONTEND/lib/types/filters.ts"
PY_FILE="$BACKEND/models/filters.py"

if [ ! -f "$TS_FILE" ]; then
  echo "  ⚠ $TS_FILE 不存在（Phase 1 未完成，跳过）"
elif [ ! -f "$PY_FILE" ]; then
  echo "  ⚠ $PY_FILE 不存在（Phase 1 未完成，跳过）"
else
  # 提取 TS DimensionState 字段名
  ts_fields=$(grep -oP '^\s+(\w+)\s*[:\?]' "$TS_FILE" | tr -d ' :?' | sort || true)
  # 提取 Python UnifiedFilter 字段名（snake_case）
  py_fields=$(grep -oP '^\s+(\w+)\s*:' "$PY_FILE" | tr -d ' :' | grep -v "class\|def\|model_config" | sort || true)

  if [ -z "$ts_fields" ] || [ -z "$py_fields" ]; then
    echo "  ⚠ 无法解析类型字段（文件结构不匹配预期），跳过"
  else
    # 简化检查: 验证关键维度字段是否两端都有
    REQUIRED_FIELDS="country team cc granularity channel"
    drift_found=0
    for field in $REQUIRED_FIELDS; do
      in_ts=$(echo "$ts_fields" | grep -c "^${field}$" || true)
      # Python 用 snake_case, 需检查原名或转换后名
      py_check="$field"
      in_py=$(echo "$py_fields" | grep -c "^${py_check}$" || true)
      if [ "$in_ts" -eq 0 ] || [ "$in_py" -eq 0 ]; then
        echo "  ✗ 字段 '$field' drift: TS=${in_ts} PY=${in_py}"
        drift_found=$((drift_found + 1))
      fi
    done
    if [ "$drift_found" -eq 0 ]; then
      echo "  ✓ 核心维度字段两端匹配"
    else
      violations=$((violations + drift_found))
    fi
  fi
fi

echo ""

# ── 汇总 ──────────────────────────────────────────────────────────────

echo "=== 结果 ==="
if [ "$violations" -eq 0 ]; then
  echo "✓ 全部通过 — 0 违规"
  exit 0
else
  echo "✗ 发现 $violations 项违规"
  echo ""
  echo "修复指南:"
  echo "  - 直接 useSWR → 改为 import { useFilteredSWR } from '@/lib/hooks/use-filtered-swr'"
  echo "  - 缺 parse_filters → 添加 filters: UnifiedFilter = Depends(parse_filters)"
  echo "  - 类型 drift → 同步更新 filters.ts 和 filters.py"
  echo ""
  echo "规格文档: docs/specs/dimension-framework.md"
  exit 1
fi
