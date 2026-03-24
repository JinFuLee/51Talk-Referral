# 后端持久化 SEE 合规 — 执行报告

## 完成状态：全部 3 项修复完成

### Fix 1：config/ 自动备份

- 新增 `_backup_config_file(path)` 函数，写入 `config/backups/`，保留最近 10 个备份
- 覆盖所有 PUT 端点：`put_panel_config` / `put_targets_month` / `put_targets_v2` / `put_exchange_rate`
- `indicator_matrix.py` 的 `put_indicator_matrix` 和 `reset_indicator_matrix` 均已接入（import from config）

### Fix 2：新增围场角色 + 打卡阈值 API

**新端点（均挂载于 `/api/config/`）：**

| 路径 | 方法 | 说明 |
|------|------|------|
| `/enclosure-role` | GET | 返回 narrow/wide 围场角色，含 override 合并 |
| `/enclosure-role` | PUT | 写入 `config/enclosure_role_override.json`（含备份） |
| `/checkin-thresholds` | GET | 返回打卡率阈值（默认 good=0.6, warning=0.3, danger=0.0） |
| `/checkin-thresholds` | PUT | 写入 `config/checkin_thresholds.json`（含备份） |

围场角色数据结构与前端 `EnclosureRoleAssignment` 一致：
```json
{
  "narrow": {"M0": ["CC"], "M1": ["CC"], "M2": ["CC", "SS"], ...},
  "wide": {"M0": ["CC"], "M1": ["CC"], "M2": ["CC"], ...}
}
```

### Fix 3：启动时 config/ 完整性检测

`main.py` lifespan 在 `dm.load_all()` 后检测 3 个文件：
- `targets_override.json`
- `exchange_rate.json`
- `indicator_matrix_override.json`

缺失时自动从 `config/backups/` 恢复最新备份，无备份则 warning 并使用默认值。

## 验证结果

```
uv run python -c "from backend.main import app; print('ok')"
→ ok

git commit: 0e6dd9d8
3 files changed, 113 insertions(+), 1 deletion(-)
```

ruff 检测：0 新增 lint 错误（9 条均为原有预存 B904/F841/SIM108，非本次引入）
