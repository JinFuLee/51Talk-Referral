"""
terminal/config.py
读取 Terminal Agent 所需的配置：
  - ANTHROPIC_API_KEY：环境变量优先，其次 key/anthropic.json
  - BACKEND_URL：默认 http://localhost:8000
  - MODEL_NAME：默认 claude-sonnet-4-20250514
  - MAX_TOKENS：默认 4096
  - SYSTEM_PROMPT：中文分析助手提示词
"""
from __future__ import annotations

import json
import os
from pathlib import Path

# 项目根目录（terminal/ 的上一级）
_PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _load_api_key() -> str:
    """
    读取 Anthropic API key。
    优先级：环境变量 ANTHROPIC_API_KEY → key/anthropic.json
    """
    env_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if env_key:
        return env_key

    key_file = _PROJECT_ROOT / "key" / "anthropic.json"
    if key_file.exists():
        data = json.loads(key_file.read_text(encoding="utf-8"))
        # 支持 {"api_key": "..."} 或 {"key": "..."}
        key = data.get("api_key") or data.get("key") or ""
        if key:
            return key

    raise RuntimeError(
        "Anthropic API key 未配置。\n"
        "请设置环境变量 ANTHROPIC_API_KEY，"
        "或在 key/anthropic.json 中填写 {\"api_key\": \"sk-ant-...\"}。"
    )


ANTHROPIC_API_KEY: str = ""   # 懒加载，调用 get_api_key() 获取
BACKEND_URL: str = os.environ.get("BACKEND_URL", "http://localhost:8000")
MODEL_NAME: str = os.environ.get("MODEL_NAME", "claude-sonnet-4-20250514")
MAX_TOKENS: int = int(os.environ.get("MAX_TOKENS", "4096"))

SYSTEM_PROMPT: str = """你是 ref-ops-engine 分析助手，专门服务于 51Talk 泰国转介绍运营团队。

你可以调用以下类型的 API 工具：
- **分析端点**（/api/analysis/*）：查询 KPI、排名、漏斗、渠道、围场等核心指标
- **洞察端点**（/api/analysis/insights/*）：获取根因分析、影响链、5-Why 诊断
- **报告端点**（/api/reports/*）：生成和查看运营/管理层报告
- **快照端点**（/api/snapshots/*）：查询历史数据和趋势
- **配置端点**（/api/config/*）：读取系统配置

业务术语：
- CC=前端销售，SS=后端销售，LP=后端服务
- 围场=用户付费当日起算的分段（0-30/31-60/61-90/91-180/181+天）
- 有效学员=次卡>0且在有效期内
- 触达率=有效通话(>=120s)学员/有效学员
- 币种：统一显示 $USD (฿THB)，汇率 1:34

**回复要求**：
1. 全程使用中文
2. 数字结论先行，再展开细节
3. 遇到数据问题（如需要先运行分析），主动提示用户执行 POST /api/analysis/run
4. 图表数据用简洁的文字描述趋势
5. 操作建议量化到具体金额或人数
"""


def get_api_key() -> str:
    """获取 API key（懒加载，每次调用时读取）"""
    global ANTHROPIC_API_KEY
    if not ANTHROPIC_API_KEY:
        ANTHROPIC_API_KEY = _load_api_key()
    return ANTHROPIC_API_KEY
