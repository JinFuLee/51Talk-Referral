# MK 产出：前端持久化迁移（localStorage→API）

**任务**：将 EnclosureRoleCard 和 useCheckinThresholds 从 localStorage 迁移到后端 API 持久化
**状态**：完成 ✓
**Commit**：`bd5880aa`

## 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `frontend/lib/api.ts:347-362` | 新增 | configAPI 新增 4 个端点 |
| `frontend/app/settings/EnclosureRoleCard.tsx` | 重写 | localStorage → SWR + PUT，含迁移逻辑 |
| `frontend/lib/hooks/useCheckinThresholds.ts` | 重写 | localStorage → SWR + PUT，新增 update() |
| `frontend/app/settings/CheckinThresholdsCard.tsx` | 更新 | 改用 useCheckinThresholds().update() |

## 新增 API 端点（configAPI 命名空间）

```typescript
getEnclosureRole()           // GET /api/config/enclosure-role
putEnclosureRole(data)       // PUT /api/config/enclosure-role
getCheckinThresholds()       // GET /api/config/checkin-thresholds
putCheckinThresholds(data)   // PUT /api/config/checkin-thresholds
```

## 关键设计决策

1. **一次性迁移**：API 首次返回空数据时，自动读取 localStorage 旧数据 → PUT 到 API → 删除 localStorage
2. **乐观更新**：`mutate(newData, false)` 跳过重新 fetch，保持 UI 即时响应
3. **降级兼容**：`saveThresholds()` 保留为 `@deprecated`，PUT 失败时回退写 localStorage
4. **事件通知**：保留 `window.dispatchEvent(new Event('enclosure-role-changed'))` 和 `checkin-thresholds-changed`，同 tab 内其他组件可订阅

## TypeScript 验证

```
npx tsc --noEmit → 0 errors
```
