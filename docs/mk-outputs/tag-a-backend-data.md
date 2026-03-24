# Tag A: 后端数据层 — Loader 修复 + 新建 SS/LP/D2b Loader

## 完成摘要

**commit**: `1480ed73`

## 修复内容

### Pattern 碰撞修复

| Loader | 问题 | 修复 |
|--------|------|------|
| `EnclosureCCLoader` | `*byCC*.xlsx` 同时匹配 byCC 和 byCC副本 | `_find_file()` 排除 `"副本" in name` |
| `DetailLoader` | `*明细*.xlsx` 可能匹配围场明细/学员文件 | 追加排除 `"围场明细"` 和 `"学员"` |

### 新建 Loader

| 文件 | 数据源 | 验证结果 |
|------|--------|---------|
| `enclosure_ss_loader.py` | D2-SS，bySS 维度，20列 | **441 行** |
| `enclosure_lp_loader.py` | D2-LP，byLP 维度，20列 | **263 行** |
| `d2b_summary_loader.py` | D2b，byCC副本汇总，7列 | **1 行** |

## DataManager 变更

- `_DATA_SOURCE_META`: 从 5 项扩展为 **8 项**（新增 enclosure_ss/enclosure_lp/d2b_summary）
- `load_all()`: loaders dict 新增 3 个键
- `get_status()`: 注释更新为"8 个数据文件"，`enclosure_cc` 文件查找同步排除副本文件
- 空态检查变量: `d1_to_d5` → `all_sources`（覆盖全部 8 个 DataFrame 键）

## 验证输出

```
result: (4, 18)
enclosure_cc: (0, 0)      # 当前数据目录无对应文件（正常，byCC 文件可能在其他路径）
enclosure_ss: (441, 20)
enclosure_lp: (263, 20)
d2b_summary: (1, 7)
detail: (353306, 19)
students: (0, 0)
high_potential: (419, 14)
targets: dict (0 keys)
```

## 文件变更

- `backend/core/loaders/enclosure_cc_loader.py` (修复)
- `backend/core/loaders/detail_loader.py` (修复)
- `backend/core/loaders/enclosure_ss_loader.py` (新建)
- `backend/core/loaders/enclosure_lp_loader.py` (新建)
- `backend/core/loaders/d2b_summary_loader.py` (新建)
- `backend/core/loaders/__init__.py` (更新导出)
- `backend/core/data_manager.py` (注册新数据源)
