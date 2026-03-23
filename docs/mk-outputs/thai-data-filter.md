# 泰国数据过滤实现报告

## 任务摘要
在 `DataManager` 加载层添加泰国团队过滤，排除 GZ-（广州）等非泰国数据，仅保留 TH- 前缀团队行。

## 实现状态
**已完成** — 过滤逻辑 `_filter_thai_only` 已存在于文件中，本次修复了 `null` 行被误过滤的问题。

## 修改文件
- `/Users/felixmacbookairm4/Desktop/ref-ops-engine/backend/core/data_manager.py`
  - 第 137-144 行：修复过滤逻辑，null/空字符串行现在被保留（不代表非泰国数据）

## 过滤逻辑说明
```python
# 检查列: last_cc_group_name, last_ss_group_name, last_lp_group_name
# 保留规则（OR 逻辑）:
#   - 任一团队列以 "TH"（大小写不敏感）开头 → 保留（泰国团队）
#   - 列值为 null/空字符串/NAN → 保留（跨团队公共数据）
#   - 不含任何团队列的 DataFrame → 原样返回（如学员维度数据）
```

## SEE 全局扫描结果
- **无绕过路径**：所有 API（`backend/api/*.py` 共 15 个文件）均通过 `dm.load_all()` 访问数据
- Loader 类仅在 `data_manager.py` 中实例化，外部无直接调用

## 验证
```bash
uv run python -c "from backend.core.data_manager import DataManager; ..."
# 过滤前 6 行 -> 过滤后 4 行（保留 TH-CC01, None, TH-CC02, 空字符串，排除 GZ-CC07, GZ-CC08）
```
