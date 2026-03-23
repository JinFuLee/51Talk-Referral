#!/usr/bin/env bash
# 指标矩阵完整性检查 — SEE 自动化防线
set -euo pipefail

CONFIG="projects/referral/config.json"
OVERRIDE="config/indicator_matrix_override.json"

echo "=== 指标矩阵完整性检查 ==="

# 1. config.json 有 indicator_registry 且非空
REG_COUNT=$(uv run python -c "import json; print(len(json.loads(open('$CONFIG').read()).get('indicator_registry',[])))")
echo "✓ Registry: $REG_COUNT indicators"
[ "$REG_COUNT" -ge 30 ] || { echo "✗ Registry 少于 30 项"; exit 1; }

# 2. indicator_matrix 有 CC/SS/LP
for role in CC SS LP; do
  COUNT=$(uv run python -c "import json; m=json.loads(open('$CONFIG').read())['indicator_matrix']['$role']; print(len(m['active']))")
  echo "✓ $role active: $COUNT"
done

# 3. SS/LP 是 CC 子集
uv run python -c "
import json
cfg = json.loads(open('$CONFIG').read())
m = cfg['indicator_matrix']
cc = set(m['CC']['active'])
for r in ['SS','LP']:
    s = set(m[r]['active'])
    diff = s - cc
    if diff:
        print(f'✗ {r} 有 {len(diff)} 个不在 CC 中: {diff}')
        exit(1)
    print(f'✓ {r} ⊂ CC')
"

# 4. override 文件可读（如存在）
if [ -f "$OVERRIDE" ]; then
  uv run python -c "import json; json.loads(open('$OVERRIDE').read()); print('✓ Override file valid')"
else
  echo "ℹ Override file not found (using defaults)"
fi

echo "=== 全部通过 ==="
