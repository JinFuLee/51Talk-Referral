# MK-SSOT 修复报告：checkin.py 配置 SSoT 同步

## 问题
`_get_wide_role()` 从 `config.json` 读旧配置，Settings 页面写入 `config/enclosure_role_override.json`，两条路径不一致。用户在 Settings 移除 SS 后，打卡 API 仍返回 SS 数据。

## 修复内容

### Fix 1 — `_get_wide_role()` 读取 override 文件（`checkin.py` L119-172）
- 优先读 `config/enclosure_role_override.json` 的 `wide` 字段
- 格式转换：`{month: [roles]} → {role: [bands]}`
- M6+ / 运营 特殊处理：同时追加 "181+"
- 三级 fallback 链：override → config.json enclosure_role_wide → 硬编码

### Fix 2 — `_get_config()` mtime 缓存失效（`checkin.py` L51-67）
- 新增模块级 `_CONFIG_MTIME: float = 0.0`
- 每次调用检查 `config.json` 的 `st_mtime`，有变化则重载缓存
- 防止服务运行期间 config.json 被手动修改但不生效

## SEE 全局扫描
`_get_config()` 调用方：L157/180/192/200/316，全部只读 `.get()`，mtime 检查无副作用。

## 验收
```bash
# 从 override 文件移除 SS → 验证 API 不返回 SS 数据
uv run python -c "
import sys; sys.path.insert(0, '.')
from backend.api.checkin import _get_wide_role
print(_get_wide_role())
"
```

## Commit
`bd4ba3b7` — fix(checkin): _get_wide_role() 读取 override 文件 + _get_config() mtime 缓存失效
