"""
51Talk 转介绍周报自动生成 - 配置文件
"""
import os
from pathlib import Path
from datetime import datetime, timedelta
import calendar

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# 基础路径 (core/ 的上两级是项目根目录: backend/core/ -> backend/ -> project_root/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
INPUT_DIR = BASE_DIR / "input"
OUTPUT_DIR = BASE_DIR / "output"
LOG_DIR = BASE_DIR / "logs"
DATA_DIR = BASE_DIR / "data"

# 数据源路径 (从环境变量获取)
DATA_SOURCE_DIR_STR = os.getenv("DATA_SOURCE_DIR")
if not DATA_SOURCE_DIR_STR:
    print("WARNING: DATA_SOURCE_DIR not set in .env")
    DATA_SOURCE_DIR = Path("/tmp/fallback_data_source")
else:
    DATA_SOURCE_DIR = Path(DATA_SOURCE_DIR_STR)


def calculate_progress(date: datetime = None) -> float:
    """
    智能计算月度时间进度

    规则:
    - 数据为T-1 (今天处理的是昨天的数据)
    - 周六日权重 1.4x (业绩通常更高)
    - 周三权重 0.7x (通常较低)
    - 其他工作日权重 1.0x

    Returns:
        加权后的时间进度比例 (0.0 ~ 1.0)
    """
    if date is None:
        date = datetime.now()

    # T-1: 实际数据日期是昨天
    data_date = date - timedelta(days=1)

    year, month = data_date.year, data_date.month
    days_in_month = calendar.monthrange(year, month)[1]
    current_day = data_date.day

    # 权重定义
    WEIGHTS = {
        0: 1.0,   # 周一
        1: 1.0,   # 周二
        2: 0.0,   # 周三 (不计入)
        3: 1.0,   # 周四
        4: 1.0,   # 周五
        5: 1.4,   # 周六 (高)
        6: 1.4,   # 周日 (高)
    }

    # 计算已过天数的加权值
    elapsed_weight = sum(
        WEIGHTS[datetime(year, month, d).weekday()]
        for d in range(1, current_day + 1)
    )

    # 计算全月的加权值
    total_weight = sum(
        WEIGHTS[datetime(year, month, d).weekday()]
        for d in range(1, days_in_month + 1)
    )

    return round(elapsed_weight / total_weight, 4)


def get_targets(date: datetime = None) -> dict:
    """获取当月目标配置，自动计算时间进度。支持 V2 override。"""
    import json

    if date is None:
        date = datetime.now()

    month_key = date.strftime("%Y%m")

    # 1. 读基础扁平目标
    base = MONTHLY_TARGETS.get(month_key, MONTHLY_TARGETS.get("202601", {})).copy()

    # 2. 读 override（如果存在）
    override_file = BASE_DIR / "config" / "targets_override.json"
    if override_file.exists():
        try:
            overrides = json.loads(override_file.read_text(encoding="utf-8"))
            month_data = overrides.get(month_key, {})
            if month_data.get("version") == 2:
                # V2 结构 → flatten 后合并
                from models.config import MonthlyTargetV2
                v2 = MonthlyTargetV2(**month_data)
                base.update(v2.flatten())
            elif month_data:
                # 普通扁平 override
                base.update(month_data)
        except Exception:
            pass

    # 3. 追加时间进度
    base["时间进度"] = calculate_progress(date)

    return base


# ── 委托层：所有业务常量统一从 projects/referral/config.json 读取 ─────────────
# 消费方无需改动（from core.config import MONTHLY_TARGETS 等均继续有效），
# 但数据源已统一，修改 JSON 即全局生效，不会静默分叉。
from .project_config import load_project_config as _load_project_config

_cfg = _load_project_config("referral")

# 月度目标配置（委托 ProjectConfig）
MONTHLY_TARGETS: dict = _cfg.monthly_targets

# 数据列映射（委托 ProjectConfig）
COLUMN_MAPPING: dict = _cfg.column_mapping

# 输出Excel样式配置（本地独有，不在 JSON 中，保留原值）
STYLES = {
    "header_fill": "#4472C4",         # 表头背景色
    "header_font_color": "#FFFFFF",   # 表头字体颜色
    "percent_format": "0.00%",         # 百分比格式
    "number_format": "#,##0",          # 数字格式
    "currency_format": "$#,##0",       # 货币格式
}

# 汇率配置（委托 ProjectConfig）
EXCHANGE_RATE_THB_USD: float = _cfg.exchange_rate.get("THB_USD", 34.0)

# ROI 真实成本模型配置（委托 ProjectConfig）
ROI_COST_CONFIG: dict = _cfg.roi_cost_config

# 异常检测配置（委托 ProjectConfig）
ANOMALY_CONFIG: dict = _cfg.anomaly_config

# LTV 分析配置（委托 ProjectConfig）
LTV_CONFIG: dict = _cfg.ltv_config


def format_currency(usd_value: float, show_thb: bool = True) -> str:
    """
    统一的金额格式化函数

    Args:
        usd_value: USD 金额
        show_thb: 是否显示 THB（默认 True）

    Returns:
        格式化后的字符串，如 "32,000THB($1,000)" 或 "$1,000"
    """
    if show_thb:
        thb = usd_value * EXCHANGE_RATE_THB_USD
        if abs(usd_value) >= 1000:
            return f"{thb:,.0f}THB(${usd_value:,.0f})"
        else:
            return f"{thb:,.1f}THB(${usd_value:,.1f})"
    else:
        if abs(usd_value) >= 1000:
            return f"${usd_value:,.0f}"
        else:
            return f"${usd_value:,.1f}"

# 确保目录存在
INPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
