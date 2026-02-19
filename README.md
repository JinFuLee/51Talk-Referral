# ref-ops-engine

51Talk 泰国转介绍业务运营分析引擎。从 Excel 数据源自动生成双版本（运营版/管理层版）分析报告，内置 Streamlit Web 面板。

## 功能

- **数据解析**: 自定义 zipfile+xml 解析器，兼容各版本 Excel
- **自动分析**: 进度/漏斗/趋势/渠道对比/团队排名/风险预警/ROI 七维分析
- **双版本报告**: 运营版（战术执行层）+ 管理层版（战略决策层）
- **可视化**: 8 个 Mermaid 图表 + emoji 仪表盘 + 热力图
- **Web 面板**: Streamlit 本地面板，支持配置/预览/导出
- **多语言**: 中文 / 泰文切换

## 快速启动

### macOS
双击 `启动面板.command` 文件，浏览器自动打开。

### 命令行
```bash
python3 start.py
```

### 手动启动
```bash
pip install -r requirements.txt
streamlit run app.py
```

## 项目结构

```
ref-ops-engine/
├── app.py                    # Streamlit Web 面板
├── start.py                  # 一键启动脚本
├── 启动面板.command           # macOS 双击启动
├── requirements.txt          # Python 依赖
├── CLAUDE.md                 # AI 辅助开发规范
│
├── src/                      # 核心代码
│   ├── __init__.py
│   ├── data_processor.py     # Excel 数据解析（XlsxReader + DataProcessor）
│   ├── analysis_engine.py    # 七维数据分析引擎
│   ├── md_report_generator.py # Markdown 双版本报告生成器
│   ├── report_generator.py   # Excel 报告生成器（xlsxwriter）
│   ├── config.py             # 月度目标配置
│   ├── file_watcher.py       # 文件监控模块
│   └── main.py               # CLI 入口
│
├── input/                    # Excel 数据源（.gitignore）
├── output/                   # 生成的报告
├── config/                   # 面板配置持久化
│
├── docs/                     # 项目文档
│   ├── roadmap.md            # 产品路线图
│   └── research/             # 调研文档
│       ├── scoring-framework.md
│       ├── scoring-result.md
│       ├── scoring-after-iteration.md
│       └── visualization-enhancement.md
│
└── key/                      # 凭证存储（.gitignore）
```

## 数据流

```
Excel 数据源 → XlsxReader → DataProcessor → AnalysisEngine → MarkdownReportGenerator → .md 报告
                                                                     ↓
                                                              Streamlit Web 面板
```

## 核心概念

| 概念 | 说明 |
|------|------|
| T-1 | 报告日期为今天，数据截止到昨天 |
| 加权时间进度 | 周六日 1.4x，周三 0.0 |
| 效能指数 | 付费占比 / 注册占比，衡量渠道质量 |
| 窄口/宽口 | 窄口 = CC/SS 直接推荐（高质量），宽口 = 平台分享（低质量） |

## 技术栈

- Python 3.9+
- Streamlit（Web 面板）
- xlsxwriter（Excel 输出）
- zipfile + xml.etree（Excel 解析，绕过 openpyxl 兼容性问题）
- Mermaid（报告内嵌图表）

## 里程碑

| 版本 | 内容 | 状态 |
|------|------|------|
| M1 | CLI 报告生成 | ✅ 完成 |
| M2 | 报告质量迭代（51→82/86 分） | ✅ 完成 |
| M3 | Streamlit Web 面板 | ✅ 完成 |
| M3.5 | 可视化增强（+8 图表） | ✅ 完成 |
| M3.6 | 多语言 + 文案润色 | ✅ 完成 |
| M4 | CSV 个人明细接入 | 待排期 |
| M5 | 数据源扩展 | 待排期 |
| M6 | 自动化运维 | 待排期 |
