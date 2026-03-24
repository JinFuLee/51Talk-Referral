# MK 产出：钉钉 followup_per_cc 同步 Lark 最新格式

## 改动摘要

### scripts/dingtalk_engine.py — `_process_followup_per_cc`

| 项目 | 改前 | 改后 |
|------|------|------|
| 围场来源 | 固定 CC | `_lb._get_role_enclosures(role)` 从 Settings 读取 |
| 角色参数 | 固定 "CC" | 接受传入 `role`，支持 CC/LP/SS |
| 学员过滤 | 全量学员 | 只保留角色对应围场（`valid_encs`） |
| 团队排除 | 无 | LP → 排除 TH-LP01Region |
| 消息格式 | `### 👤 CC名` + 全量ID列表 | `👤 **CC名** ▸ 未打卡N人` + `📷 链接` + 围场分段ID |
| ID 排版 | 一行全部ID | 按围场分段，每行8个 |
| 总览图文件名 | `lark-overview-{date}.png` | `lark-overview-{role}-{date}.png`（含角色区分） |

### scripts/dingtalk_daily.py

- `--followup` 加 `--role CC/LP/SS` 参数（default: CC）
- `_process_followup_per_cc` 调用改为 `args.role.upper()`

## 验证结果

```
CC: role=CC, 围场=M0, M1, M2, 858名未打卡学员, 52张图片就绪 ✓
LP: role=LP, 围场=M3, M4, M5, 1178名未打卡学员, 21张图片就绪 ✓
ruff lint: All checks passed! ✓
```

## 使用方法

```bash
# CC 未打卡跟进（dry-run）
uv run python scripts/dingtalk_daily.py --followup --role CC --channel test --dry-run

# LP 未打卡跟进（正式群）
uv run python scripts/dingtalk_daily.py --followup --role LP --channel cc_all --confirm
```

## Commits

- `976df2d5` feat: sync dingtalk followup_per_cc with lark format
- `4bd7bf96` fix: ruff lint E501/B007 in _process_followup_per_cc
