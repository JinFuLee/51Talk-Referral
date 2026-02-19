"""
51Talk 转介绍周报自动生成 - 配置文件
"""
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import calendar
from dotenv import load_dotenv

# 加载 .env
load_dotenv()

# 基础路径 (src 的上一级是项目根目录)
BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_DIR = BASE_DIR / "input"
OUTPUT_DIR = BASE_DIR / "output"
LOG_DIR = BASE_DIR / "logs"
DATA_DIR = BASE_DIR / "data"

# 数据源路径 (从环境变量获取)
DATA_SOURCE_DIR_STR = os.getenv("DATA_SOURCE_DIR")
if not DATA_SOURCE_DIR_STR:
    # Fallback or Error? Warning for now.
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
    """获取当月目标配置，自动计算时间进度"""
    if date is None:
        date = datetime.now()
    
    month_key = date.strftime("%Y%m")
    
    # 基础目标 (可按月份扩展)
    base = MONTHLY_TARGETS.get(month_key, MONTHLY_TARGETS.get("202601", {})).copy()
    base["时间进度"] = calculate_progress(date)
    
    return base


# 月度目标配置
MONTHLY_TARGETS = {
    "202601": {
        "注册目标": 779,
        "付费目标": 179,
        "金额目标": 147848,
        "客单价": 825,
        "目标转化率": 0.23,
        "约课率目标": 0.77,
        "出席率目标": 0.66,
    },
    "202602": {
        "注册目标": 869,
        "付费目标": 200,
        "金额目标": 169800,
        "客单价": 850,
        "目标转化率": 0.23,
        "约课率目标": 0.77,
        "出席率目标": 0.66,
        # 子口径拆分
        "子口径": {
            "CC窄口径": {"倒子目标": 217},
            "SS窄口径": {"倒子目标": 87},
            "LP窄口径": {"倒子目标": 87},
            "宽口径": {"倒子目标": 478},
        }
    }
}

# 数据列映射
COLUMN_MAPPING = {
    # 总计口径
    "总计": {
        "注册": "C", "预约": "D", "出席": "E", "付费": "F", "美金金额": "G",
        "注册付费率": "H", "预约率": "I", "预约出席率": "J", "出席付费率": "K"
    },
    # CC窄口径
    "CC窄口径": {
        "注册": "L", "预约": "M", "出席": "N", "付费": "O", "美金金额": "P",
        "注册付费率": "Q", "预约率": "R", "预约出席率": "S", "出席付费率": "T"
    },
    # SS窄口径
    "SS窄口径": {
        "注册": "U", "预约": "V", "出席": "W", "付费": "X", "美金金额": "Y",
        "注册付费率": "Z", "预约率": "AA", "预约出席率": "AB", "出席付费率": "AC"
    },
    # 其它(宽口径)
    "其它": {
        "注册": "AD", "预约": "AE", "出席": "AF", "付费": "AG", "美金金额": "AH",
        "注册付费率": "AI", "预约率": "AJ", "预约出席率": "AK", "出席付费率": "AL"
    }
}

# 输出Excel样式配置
STYLES = {
    "header_fill": "#4472C4",         # 表头背景色
    "header_font_color": "#FFFFFF",   # 表头字体颜色
    "percent_format": "0.00%",         # 百分比格式
    "number_format": "#,##0",          # 数字格式
    "currency_format": "$#,##0",       # 货币格式
}

# 汇率配置
EXCHANGE_RATE_THB_USD = 32.0  # THB 转 USD 汇率（1 USD = 32 THB）

# ROI 真实成本模型配置（基于 2026年转介绍ROI测算数据新模版.xlsx）
ROI_COST_CONFIG = {
    "CARD_COST_PER_UNIT": 1.31,  # USD/张（次卡单位成本）
    "CASH_COMMISSION_SMALL": 38,  # USD（小单现金佣金，订单 <850 USD）
    "CASH_COMMISSION_LARGE": 68,  # USD（大单现金佣金，订单 >=850 USD）
    "CASH_THRESHOLD": 850,  # USD（大小单分界线）
}

# 异常检测配置
ANOMALY_CONFIG = {
    "std_threshold": 2.0,        # 标准差倍数
    "decline_threshold": 0.3,    # 环比下滑阈值
    "conversion_floor": 0.05,    # 转化率下限
    "rest_days": [2],            # 周三=2(0=周一)，休息日前后不算异常
}

# LTV 分析配置
LTV_CONFIG = {
    "default_renewal_rate": 0.3,       # 默认续费率
    "narrow_renewal_rate": 0.4,        # 窄口径续费率（假设更高质量）
    "wide_renewal_rate": 0.25,         # 宽口径续费率（假设较低）
}


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
