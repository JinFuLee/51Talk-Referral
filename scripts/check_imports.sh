#!/usr/bin/env bash
# check_imports.sh — 检测 backend/ 中未升级的裸包导入 + 禁止的合成数据函数（SEE 自动化防线）
# 检测目标1：from services. / from core. / from models. 开头的裸导入
# 检测目标2：_demo_ / _mock_ 函数定义（合成业务数据，禁止引入）
# 排除：注释行、相对导入（from .xxx）、已迁移为 from backend.* 的导入
#
# 用法：bash scripts/check_imports.sh
# 退出码：0 = 全部通过，1 = 发现违规

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)/backend"

echo "=== check_imports.sh: 扫描裸包导入 + 禁止合成数据函数 ==="
echo "目标目录: ${BACKEND_DIR}"

FOUND=0

# 使用 bash glob 遍历，排除注释行
shopt -s globstar nullglob
for f in "${BACKEND_DIR}"/**/*.py; do
    # 逐行检查
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
        # 检测禁止的合成数据函数定义（_demo_* / _mock_*）
        if [[ "${line}" =~ ^[[:space:]]*def[[:space:]]+(_(demo|mock)_[a-zA-Z_]+)[[:space:]]*\( ]]; then
            echo "BANNED PATTERN (合成数据函数): ${f}: ${line}"
            FOUND=1
        fi
    done < "${f}"
done

if [ "${FOUND}" -eq 0 ]; then
    echo "OK: 0 裸导入，0 合成数据函数"
    exit 0
else
    echo "FAIL: 发现违规，请修复后重试"
    exit 1
fi
