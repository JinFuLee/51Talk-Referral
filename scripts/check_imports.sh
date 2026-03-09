#!/usr/bin/env bash
# check_imports.sh — 检测 backend/ 中未升级的裸包导入（SEE 自动化防线）
# 检测目标：from services. / from core. / from models. 开头的裸导入
# 排除：注释行、相对导入（from .xxx）、已迁移为 from backend.* 的导入
#
# 用法：bash scripts/check_imports.sh
# 退出码：0 = 无裸导入，1 = 发现裸导入

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)/backend"

echo "=== check_imports.sh: 扫描裸包导入 ==="
echo "目标目录: ${BACKEND_DIR}"

FOUND=0

# 使用 grep（bash glob 遍历），排除注释行
shopt -s globstar nullglob
for f in "${BACKEND_DIR}"/**/*.py; do
    # 逐行检查：from services. / from core. / from models.（行首或缩进后）
    while IFS= read -r line; do
        # 跳过注释行
        stripped="${line#"${line%%[^[:space:]]*}"}"  # trim leading whitespace
        if [[ "${stripped}" == \#* ]]; then
            continue
        fi
        # 检测裸导入（未加 backend. 前缀）
        if [[ "${line}" =~ (from[[:space:]]+(services|core|models)\.) ]] && \
           [[ "${line}" != *"from backend."* ]] && \
           [[ "${line}" != *"from ."* ]]; then
            echo "BARE IMPORT: ${f}: ${line}"
            FOUND=1
        fi
    done < "${f}"
done

if [ "${FOUND}" -eq 0 ]; then
    echo "OK: 0 裸导入"
    exit 0
else
    echo "FAIL: 发现裸导入，请统一为 from backend.* 绝对导入"
    exit 1
fi
