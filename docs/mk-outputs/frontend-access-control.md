# 前端权限管理页面 — 交付报告

**提交**：`35c57d1d` (已推送)
**任务**：Task #3 frontend: 权限管理页面 /access-control

## 交付文件

| 文件 | 说明 |
|------|------|
| `frontend/app/[locale]/access-control/page.tsx` | 主页面：4 Tab + useSWR + optimistic update |
| `frontend/app/[locale]/access-control/PageOverview.tsx` | 页面总览：6 类分组 + 公开 toggle |
| `frontend/app/[locale]/access-control/UserManagement.tsx` | 用户管理：新增/批量/删除/改角色 |
| `frontend/app/[locale]/access-control/RoleEditor.tsx` | 角色管理：页面权限 checkbox 分组编辑 |
| `frontend/app/[locale]/access-control/PermissionMatrix.tsx` | 权限矩阵：用户×分类只读视图 |
| `frontend/app/[locale]/access-denied/page.tsx` | 无权限页：Shield 图标 + 返回按钮 |

## 技术要点

- **I18N**：所有组件内联 `I18N={zh,en}` 字典，通过 `useLocale()` 读取 next-intl locale（已从 Zustand 迁移）
- **数据流**：`/api/access-control` GET/PUT，optimistic update + SWR mutate 回滚
- **设计合规**：card-base / btn-primary / btn-secondary / input-base / state-loading / state-empty / slide-thead-row 等语义类全覆盖，0 处硬编码色值
- **三态**：loading（Shield + animate-pulse）/ error（state-error）/ empty（各 Tab 独立空态）
- **tsc --noEmit**：零类型错误

## 已验证

- TypeScript 零错误
- NavSidebar 已包含 `/access-control` 导航项（`Lock` 图标，系统分类下）
- 后端 `backend/api/access_control.py` 端点：GET/PUT `/api/access-control` 已存在
