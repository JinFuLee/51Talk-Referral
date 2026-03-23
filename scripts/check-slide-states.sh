#!/usr/bin/env bash
# check-slide-states.sh — 检测 Slide 组件是否有 error 态处理
set -euo pipefail

SLIDES_DIR="frontend/components/slides"
MISSING=0

for f in "$SLIDES_DIR"/*.tsx; do
  if ! grep -qE '(error|isError).*=.*useSWR|useSWR.*error' "$f"; then
    echo "⚠ 缺少 error 态: $f"
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo "✗ $MISSING 个 Slide 组件缺少 error 态处理"
  exit 1
else
  echo "✓ 全部 Slide 组件均有 error 态处理"
  exit 0
fi
