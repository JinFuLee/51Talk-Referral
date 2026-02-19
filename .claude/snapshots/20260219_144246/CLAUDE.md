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
├── app.py                      # Streamlit 主应用入口
├── src/
│   ├── analysis_engine.py      # 数据分析引擎（进度/漏斗/趋势/渠道/团队/风险）
│   ├── md_report_generator.py  # Markdown 双版本报告生成器
│   ├── data_processor.py       # XlsxReader + DataProcessor（Excel 解析）
│   ├── config.py               # 月度目标、时间进度、列映射
│   ├── report_generator.py     # Excel 报告生成器（xlsxwriter）
│   ├── main.py                 # CLI 入口（--watch/--once/--latest）
│   ├── file_watcher.py         # 文件监控模块
│   └── agents/                 # Agent 子模块
├── input/                      # XLSX 数据源
├── output/                     # 生成的报告输出
├── config/                     # 面板配置持久化（panel_config.json）
├── docs/
│   ├── research/               # 调研文档（评分框架、评分结果、迭代对比）
│   └── roadmap.md              # 项目路线图
├── referral-review-ops-*.md    # 运营版报告模板
├── referral-review-exec-*.md   # 管理层版报告模板
└── requirements.txt
```

## 数据流
```
XLSX 文件 → XlsxReader → DataProcessor → AnalysisEngine → MarkdownReportGenerator → .md 报告
                                              ↕
                                      config.py (目标/进度)
```

## 常用命令
- **Streamlit 面板**: `python3 -m streamlit run app.py`
- **CLI 单次处理**: `python src/main.py --once <file.xlsx>`
- **CLI 监控模式**: `python src/main.py --watch`
- **测试**: `pytest`
- **类型检查**: `mypy .`
- **Lint**: `ruff check .`

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
