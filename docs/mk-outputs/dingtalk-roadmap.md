# MK 交付报告：钉钉推送集成 + M34 里程碑归档

## 项目 A：钉钉推送 student_improvement 区块

### 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `scripts/dingtalk_engine.py` | 修改 | 新增 `_fetch_student_analysis()` + `_generate_student_improvement_text()` + `_process_module` 分支 |
| `projects/referral/notification-config.json` | 修改 | 新增 `student_improvement` 模块定义，加入 `all` 路由 |

### 新增逻辑

**`_fetch_student_analysis(limit=5)`**：调用 `GET /api/checkin/student-analysis?limit=5`，含重试逻辑（复用 `_fetch_url`）。

**`_generate_student_improvement_text()`**：
- 从 `improvement_ranking` 取前 5 名，格式化为泰中双语 Markdown 表格
  - 字段：`student_id` | `enclosure_days` | `current_month_checkins` | `improvement` | `tags`
  - 进步值正数自动加 `+` 前缀
- 从 `tags_summary.沉睡高潜`（兼容 `sleeping_high_potential` 英文 key）取沉睡高潜人数
- 后端离线 / 无数据时输出友好提示（不抛出异常）

**路由位置**：`student_improvement` 插在 `action_items` 之后，体现在 `all` 路由中。

### 验证

```
ruff check scripts/dingtalk_engine.py scripts/dingtalk_daily.py → All checks passed!

dry-run 输出（后端已启动）：
### 📈 นักเรียนพัฒนาการ Top 5 เดือนนี้
### 学员打卡进步 Top5（本月）
...
| 1 | 62563229 | 1M | -- | +5 | 满勤/进步明显 |
...
**沉睡高潜（有课耗无打卡）：3863 人**
```

### 安全防线

- 遵循项目通知推送防错规则：`student_improvement` 是文本消息，走 `_process_module` → `_send_dingtalk`，同受 `--confirm` / sandbox 控制
- `_fetch_student_analysis` 失败返回 `None`，`_generate_student_improvement_text` 优雅降级显示提示

---

## 项目 B：M34 里程碑归档

### 变更文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `docs/roadmap.md` | 修改 | M33.5 重命名为 M34，加入 Phase 4 推送集成记录；M34 规划→M35；依赖图更新 |
| `CLAUDE.md` | 修改 | 里程碑摘要表新增 M34 行 |

### M34 核心成果摘要

- **后端**：`GET /api/checkin/student-analysis`（9 维度，+800 行）+ `GET /api/checkin/enclosure-thresholds`
- **前端**：`UnifiedFilterBar` + 4 Tab 重构 + 12 共享组件（频次图/四象限/漏斗等），新建 15 + 修改 6
- **推送集成**：钉钉日报新增学员进步 Top5 + 沉睡高潜区块
- **关键洞察**：80.5% 零打卡 / CC 触达参与率 49.6% vs 未触达 6.3% / 5-6 次打卡付费率 4.7% vs 零打卡 0.4%

---

生成时间：2026-03-27
