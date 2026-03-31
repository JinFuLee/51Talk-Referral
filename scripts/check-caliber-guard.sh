#!/usr/bin/env bash
# 口径守卫 CI 门控：验证校验函数存在
# 用法: bash scripts/check-caliber-guard.sh [PROJECT_DIR]
set -e

PROJECT_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)}"

errors=0

# 层 1：Schema 契约校验
if ! grep -q "_validate_schema" "$PROJECT_DIR/backend/core/data_manager.py"; then
    echo "✗ DataManager._validate_schema() 缺失" >&2
    errors=$((errors + 1))
fi

# 层 2：D1 vs D2 交叉校验
if ! grep -q "_cross_validate" "$PROJECT_DIR/backend/api/cc_performance.py"; then
    echo "✗ _cross_validate() 缺失" >&2
    errors=$((errors + 1))
fi

# 层 3：过滤覆盖率校验
if ! grep -q "_validate_filter_coverage" "$PROJECT_DIR/backend/api/cc_performance.py"; then
    echo "✗ _validate_filter_coverage() 缺失" >&2
    errors=$((errors + 1))
fi

# 告警路由
if ! grep -q "emit_caliber_alert" "$PROJECT_DIR/backend/core/caliber_guard.py"; then
    echo "✗ emit_caliber_alert() 缺失" >&2
    errors=$((errors + 1))
fi

if [ "$errors" -gt 0 ]; then
    echo "✗ 口径守卫防线验证失败（$errors 处缺失）" >&2
    exit 1
fi

echo "✓ 口径守卫防线验证通过（4/4 函数存在）"
