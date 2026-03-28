# MK-2b: i18n 翻译 JSON 文件产出报告

## 任务完成状态

✓ 4 个语言 JSON 文件全部创建完成

## 文件概览

| 文件 | 叶键数 | 命名空间数 | 说明 |
|------|--------|-----------|------|
| `frontend/messages/zh.json` | 457 | 18 | 简体中文（从 translations.ts 精确提取） |
| `frontend/messages/th.json` | 457 | 18 | 泰文（从 translations.ts 精确提取） |
| `frontend/messages/en.json` | 458 | 18 | 英文（手动翻译，业务术语映射） |
| `frontend/messages/zh-TW.json` | 457 | 18 | 繁体中文（规则转换 + 手动校正） |

## 命名空间（18 个）

`common`, `root`, `analysis`, `ranking`, `reports`, `datasources`, `snapshots`, `trend`, `ops`, `biz`, `nav`, `funnel`, `channel`, `enclosure`, `members`, `highPotential`, `team`, `matrix`

## 英文术语映射

| 中文 | 英文 |
|------|------|
| 围场 | Enclosure Period |
| 窄口 | Narrow Channel |
| 宽口 | Wide Channel |
| 打卡率 | Check-in Rate |
| 触达率 | Outreach Rate |
| 参与率 | Participation Rate |
| 转介绍 | Referral |
| 日均 | Daily Avg |
| 缺口 | Gap |
| 达标 | On Target |
| 运营 | Operations |
| 渠道 | Channel |
| 漏斗 | Funnel |
| 环比 | MoM |
| 同比 | YoY |

不翻译（保留原文）：CC/SS/LP/USD/THB/ROI/KPI/MoM/WoW/YoY/T-1

## 繁体转换规则

主要转换：数据→資料 | 设置→設定 | 渠道→管道 | 查询→查詢 | 刷新→重新整理 | 导入→匯入 | 加载→載入 | 搜索→搜尋 | 注册→註冊 | 文件→檔案

## 组件级局部 I18N 说明

15 个组件（analytics slides + notifications）有独立 `const I18N = {zh, en}` 结构，这些由 MK-3 迁移处理。当前 JSON 文件覆盖所有通过 `useTranslations` 调用的键。

## 提取方法

Python 正则从 `frontend/lib/translations.ts` 提取 `zhTranslations` 和 `thTranslations` 两个 `Record<string, string>` 变量，转换为嵌套 JSON（dot-notation → nested object）。
