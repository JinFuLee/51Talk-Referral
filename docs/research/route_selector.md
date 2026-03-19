# 路线选择状态机

## 输入

- `requires_external_freshness`: 是否需要实时外部信息
- `writes_code`: 是否需要读写代码或执行命令
- `policy_density`: low / medium / high
- `offline_mode`: 是否完全离线
- `risk_profile`: low / medium / high

## 状态机

1. 若 `offline_mode = true`
   - 跳过 Gemini
   - 调研 owner = Claude Code
2. 否则若 `requires_external_freshness = true`
   - 调研 owner = Gemini CLI
3. 否则
   - 调研 owner = Claude Code
4. 若 `policy_density = high` 或 `risk_profile != low`
   - 评审 owner = Claude Code
5. 否则
   - 评审 owner = Claude Code
6. 若 `writes_code = true`
   - 交付 owner = Codex
7. 否则
   - 交付 owner = Claude Code

## 输出

- `research_owner`
- `review_owner`
- `delivery_owner`
- `fallback_owner`

## 默认输出

- `Gemini -> Claude -> Codex`

## 例外输出

- 离线：`Claude -> Claude -> Codex`
- 纯外部调研：`Gemini -> Claude`
- 极小修复：`Codex -> Claude`
