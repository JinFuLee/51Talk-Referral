#!/usr/bin/env bash
# check-slide-states.sh — 检测 Slide/SWR 组件是否有 error 态处理
# 用法: bash scripts/check-slide-states.sh [目录路径]
# 默认: frontend/components/slides
set -euo pipefail

SLIDES_DIR="${1:-frontend/components/slides}"
MISSING=0

if [ ! -d "$SLIDES_DIR" ]; then
  echo "✗ 目录不存在: $SLIDES_DIR"
  exit 1
fi

for f in "$SLIDES_DIR"/*.tsx; do
  [ -f "$f" ] || continue
  if ! grep -qE '(error|isError).*=.*useSWR|useSWR.*error' "$f"; then
    echo "⚠ 缺少 error 态: $f"
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo "✗ $MISSING 个组件缺少 error 态处理"
  exit 1
else
  echo "✓ 全部组件均有 error 态处理 ($SLIDES_DIR)"
  exit 0
fi
