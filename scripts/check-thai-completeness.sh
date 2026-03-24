#!/usr/bin/env bash
set -euo pipefail
TARGET="scripts/dingtalk_daily.py"
VIOLATIONS=$(grep -n 'ax\.text\|ax\.set_title\|plt\.title' "$TARGET" \
  | grep -v 'TH_STRINGS' | grep -v '^\s*#' | grep -cE '"[A-Za-z ]{3,}"' || true)

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "[FAIL] 泰文完整性：发现 $VIOLATIONS 处英文字符串直接传入绘图函数"
  grep -n 'ax\.text\|ax\.set_title\|plt\.title' "$TARGET" \
    | grep -v 'TH_STRINGS' | grep -v '^\s*#' | grep -E '"[A-Za-z ]{3,}"'
  exit 1
fi
echo "[PASS] 泰文完整性：0 处英文残留"
