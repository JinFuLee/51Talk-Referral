# ref-ops-engine

51Talk 泰国转介绍运营自动化分析引擎

## 技术栈
- Python 3.9+
- Streamlit（本地 Web 面板）
- xlsxwriter（Excel 报告生成）
- zipfile+xml（Excel 读取，替代 openpyxl）

## 目录结构
```
ref-ops-engine/
├── app.py                       # Streamlit 主应用入口
├── start.py                     # 一键启动脚本
├── 启动面板.command              # macOS 双击启动
├── requirements.txt             # Python 依赖
├── CLAUDE.md                    # 本文件
│
├── src/
│   ├── __init__.py
│   ├── data_processor.py        # XlsxReader + DataProcessor（Excel 解析）
│   ├── analysis_engine.py       # 七维数据分析引擎
│   ├── md_report_generator.py   # Markdown 双版本报告生成器
│   ├── report_generator.py      # Excel 报告生成器（xlsxwriter）
│   ├── config.py                # 月度目标、时间进度、列映射
│   ├── i18n.py                  # 中泰双语翻译系统
│   ├── file_watcher.py          # 文件监控模块
│   └── main.py                  # CLI 入口（--watch/--once/--latest）
│
├── input/                       # XLSX 数据源（.gitignore）
├── output/                      # 生成的报告输出
├── config/                      # 面板配置持久化（panel_config.json）
│
├── docs/
│   ├── roadmap.md               # 项目路线图
│   └── research/                # 调研文档
│       ├── scoring-framework.md
│       ├── scoring-result.md
│       ├── scoring-after-iteration.md
│       └── visualization-enhancement.md
│
└── key/                         # 凭证存储（.gitignore）
```

## 数据流
```
Excel 数据源 → XlsxReader → DataProcessor → AnalysisEngine → MarkdownReportGenerator → .md 报告
                                                                     ↓
                                                              Streamlit Web 面板
                                                                     ↓
                                                              i18n 系统（中/泰）
```

## 常用命令
- **一键启动**: `python3 start.py` 或双击 `启动面板.command`（macOS）
- **Streamlit 面板**: `streamlit run app.py`
- **CLI 单次处理**: `python src/main.py --once <file.xlsx>`
- **CLI 监控模式**: `python src/main.py --watch`
- **测试**: `pytest`

## 代码规范
- 类型注解必须（Python 3.9+ 语法）
- 4 空格缩进，遵循 PEP 8
- Excel 列映射定义在 config.py 的 COLUMN_MAPPING
- 月度目标定义在 config.py 的 MONTHLY_TARGETS
- all_rows 使用原始列名（A/B/C...），monthly_summaries 使用中文字段名

## 关键约定
- **T-1 数据**: 今天处理的是昨天的数据
- **时间进度**: 加权计算（周六日 1.4x，周三 0.0）
- **双版本报告**: 运营版（战术执行）+ 管理层版（战略决策）
- **状态标签**: 缺口 >0% = 🟢 持平, -5%~0% = 🟡 落后, <-5% = 🔴 严重

## 里程碑摘要
| 里程碑 | 日期 | 目标 | 成果 | 文件变更 |
|--------|------|------|------|---------|
| M1 | 2026-01 | CLI 报告生成基础 | XlsxReader + DataProcessor + ReportGenerator | 5 files |
| M2 | 2026-02-19 | 报告质量评分迭代 | 15 维度评分框架，运营/管理层版双版本 82.0/86.0 分 | 3 files + docs |
| M3 | 2026-02-19 | Streamlit Web 面板 | AnalysisEngine + MarkdownReportGenerator + Streamlit 面板 | 8 files |
| M3.5 | 2026-02-19 | 可视化增强 | 8 个新增图表，运营版 2→7，管理层版 1→2 | 2 files, +370 lines |
| M3.6 | 2026-02-19 | 多语言 + 文案润色 | i18n 系统（中泰双语，147 翻译键），报告生成器 29 个方法双语化，一键启动器，文档整理 | 8 files, +900 lines, E2E 通过 |
| M3.7 | 2026-02-19 | 数据源状态面板 | 数据源注册表 + T-1 判断逻辑 + Streamlit 集成 + 中泰双语 | 2 files, +80 lines |

## 已知问题与技术债
| 序号 | 类别 | 描述 | 优先级 | 计划里程碑 | 备注 |
|------|------|------|--------|-----------|------|
| 1 | 数据局限 | § 11 销售看板使用团队级数据（CC组），待接入个人明细后升级为 CC 个人级排名 | P1 | M4 | 需要 CSV 个人明细接入 |
| 2 | 渲染兼容 | 报告 Mermaid 图表在纯文本 Markdown viewer 中显示为代码块 | P2 | M5+ | 需要 HTML 模板支持 |
