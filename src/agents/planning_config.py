"""
转介绍规划表 - 配置
"""
from pathlib import Path
from datetime import datetime, timedelta
import calendar

# === 路径配置 ===
DOWNLOADS_DIR = Path.home() / "Downloads"
SOURCE_PATTERN = "泰国运营数据看板__宣宣_转介绍不同口径对比_*.xlsx"
OUTPUT_PATH = DOWNLOADS_DIR / "01_工作数据" / "业绩报表" / "2026_转介绍规划_泰国.xlsx"

# === 月度目标配置 ===
# key: YYYYMM, 所有数值均为月度目标
MONTHLY_TARGETS = {
    "202601": {
        "总标": 147848,
        "客单价": 825,
        "转率目标": 0.23,
    },
    "202602": {
        "总标": 169596,
        "客单价": 850,
        "转率目标": 0.23,
    },
}

# === 口径映射 ===
# 源文件列映射 (与 data_processor.py 一致)
CALIBERS = ["总计", "CC窄口径", "SS窄口径", "其它"]

# 每个口径的指标顺序 (与目标xlsx结构一致)
METRICS = ["注册", "预约", "出席", "付费", "美金金额", "注册付费率", "预约率", "预约出席率", "出席付费率"]

# 目标xlsx中的口径表头名
CALIBER_HEADERS = {
    "总计": "Total",
    "CC窄口径": "CC窄口径",
    "SS窄口径": "SS窄口径",
    "其它": "宽口径（Facebook sharing）",
}

# 需要展示的历史月份 (从最早到最新)
HISTORY_MONTHS = ["202509", "202510", "202511", "202512", "202601", "202602"]


def calculate_time_progress(date: datetime = None) -> float:
    """
    智能计算月度时间进度 (T-1逻辑)

    权重:
    - 周六日: 1.4x
    - 周三: 0.0x
    - 其他工作日: 1.0x
    """
    if date is None:
        date = datetime.now()

    data_date = date - timedelta(days=1)
    year, month = data_date.year, data_date.month
    days_in_month = calendar.monthrange(year, month)[1]
    current_day = data_date.day

    WEIGHTS = {
        0: 1.0, 1: 1.0, 2: 0.0, 3: 1.0, 4: 1.0, 5: 1.4, 6: 1.4,
    }

    elapsed = sum(WEIGHTS[datetime(year, month, d).weekday()] for d in range(1, current_day + 1))
    total = sum(WEIGHTS[datetime(year, month, d).weekday()] for d in range(1, days_in_month + 1))

    return round(elapsed / total, 4) if total > 0 else 0


def get_current_month_key(date: datetime = None) -> str:
    """获取当前月份key"""
    if date is None:
        date = datetime.now()
    return date.strftime("%Y%m")


def get_targets_for_month(month_key: str) -> dict:
    """获取指定月份的目标"""
    return MONTHLY_TARGETS.get(month_key, {})
