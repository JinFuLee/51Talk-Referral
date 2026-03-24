#!/usr/bin/env bash
# 渠道归因完整性检查 — 确保 attribution_engine 消费 Settings 配置
# 用法: bash scripts/check-channel-attribution.sh
set -euo pipefail

EXIT_CODE=0
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "=== 渠道归因完整性检查 ==="

# 1. attribution_engine.py 不得硬编码 share=1.0
if grep -qn 'share.*=.*1\.0' backend/core/attribution_engine.py 2>/dev/null; then
  echo -e "${RED}✗ attribution_engine.py 含硬编码 share=1.0${NC}"
  EXIT_CODE=1
else
  echo -e "${GREEN}✓ attribution_engine.py 无硬编码 share${NC}"
fi

# 2. attribution_engine.py 必须消费 wide_role_config
if grep -q 'wide_role_config' backend/core/attribution_engine.py 2>/dev/null; then
  echo -e "${GREEN}✓ attribution_engine.py 消费 wide_role_config${NC}"
else
  echo -e "${RED}✗ attribution_engine.py 未消费 wide_role_config${NC}"
  EXIT_CODE=1
fi

# 3. channel.py 必须传递 config 到 engine
if grep -q 'wide_role_config=' backend/api/channel.py 2>/dev/null; then
  echo -e "${GREEN}✓ channel.py 传递 wide_role_config 到 engine${NC}"
else
  echo -e "${RED}✗ channel.py 未传递 wide_role_config${NC}"
  EXIT_CODE=1
fi

# 4. enclosure_role_override.json 必须存在且含 wide 字段
OVERRIDE="config/enclosure_role_override.json"
if [ -f "$OVERRIDE" ]; then
  if python3 -c "import json; d=json.load(open('$OVERRIDE')); assert 'wide' in d" 2>/dev/null; then
    echo -e "${GREEN}✓ $OVERRIDE 含 wide 配置${NC}"
  else
    echo -e "${RED}✗ $OVERRIDE 缺少 wide 字段${NC}"
    EXIT_CODE=1
  fi
else
  echo -e "${RED}✗ $OVERRIDE 不存在${NC}"
  EXIT_CODE=1
fi

# 5. 前端不含 LIMITED_CHANNELS 硬编码
MATCHES=$(find frontend -name '*.tsx' -o -name '*.ts' | xargs grep -l 'LIMITED_CHANNELS' 2>/dev/null || true)
if [ -n "$MATCHES" ]; then
  echo -e "${RED}✗ 前端含 LIMITED_CHANNELS 硬编码: ${MATCHES}${NC}"
  EXIT_CODE=1
else
  echo -e "${GREEN}✓ 前端无 LIMITED_CHANNELS 硬编码${NC}"
fi

# 6. API 返回 ≥4 个渠道（后端运行时）
if curl -sf http://localhost:8100/api/channel >/dev/null 2>&1; then
  COUNT=$(curl -s http://localhost:8100/api/channel | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")
  if [ "$COUNT" -ge 4 ]; then
    echo -e "${GREEN}✓ API 返回 ${COUNT} 个渠道（≥4）${NC}"
  else
    echo -e "${RED}✗ API 仅返回 ${COUNT} 个渠道（需 ≥4）${NC}"
    EXIT_CODE=1
  fi
else
  echo "⚠ 后端未运行，跳过 API 验证"
fi

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}=== 全部通过 ===${NC}"
else
  echo -e "${RED}=== 有失败项 ===${NC}"
fi
exit $EXIT_CODE
