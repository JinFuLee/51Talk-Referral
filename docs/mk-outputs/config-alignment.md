# TAG-CONFIG 配置对齐结果

## 变更 1：enclosure_role_override.json — 窄口角色

| 围场 | Before | After |
|------|--------|-------|
| M2 narrow | ["CC","SS","LP"] | ["CC","SS"] |
| M3 narrow | ["LP","CC","SS"] | ["LP","CC"] |
| M4 narrow | ["LP","CC","SS"] | ["LP","CC"] |
| M5 narrow | ["LP","CC","SS"] | ["LP","CC"] |
| M6+ narrow | ["LP","CC","SS"] | ["LP","CC"] |

宽口（wide）：无变更。

## 变更 2：indicator_matrix_override.json — LP active 列表

| Before | After |
|--------|-------|
| 16 项（含 checkin_count） | 15 项（移除 checkin_count） |

## 验证输出

```
LP active: 15 ✓
SS active: 13
M2 narrow: ['CC', 'SS'] ✓
M3 narrow: ['LP', 'CC'] ✓
```

## 文件路径

- `config/enclosure_role_override.json`
- `config/indicator_matrix_override.json`
