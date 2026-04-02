# MK-2 产出：快照管线接入

完成时间：2026-03-31

## 变更摘要

### 1. quickbi_cron.sh
- 在 `echo "✓ 取数成功"` 之后、`touch "$DONE_FILE"` 之前插入快照调用
- 失败为非致命（|| echo 警告），不中断主流程

### 2. quickbi_catchup.sh
- 在 `echo "✓ 补抓检查完成"` 之后插入快照调用
- 同样非致命处理

### 3. backend/main.py
- APScheduler `_daily_snapshot_job`: 09:30 → 10:30
- APScheduler `_daily_thai_snapshot_job`: 09:35 → 10:35
- 日志信息同步更新

### 4. CLAUDE.md
- §常用命令：新增 3 条快照命令（写入/回填/指定日期）
- §数据流：新增 `snapshot_daily.py` 节点
- 技术债 #24：状态改为「已解决」

## 触发链
```
launchd 10:00 → quickbi_fetch.py --headless
    → 成功 → snapshot_daily.py（主触发）
launchd 11:00 → quickbi_fetch.py --catchup
    → 完成 → snapshot_daily.py（补抓触发）
APScheduler 10:30 → _daily_snapshot_job（兜底）
APScheduler 10:35 → _daily_thai_snapshot_job（泰国口径兜底）
```

## Commit
`02b5a7c3` — feat: auto-trigger daily snapshot after Quick BI fetch
