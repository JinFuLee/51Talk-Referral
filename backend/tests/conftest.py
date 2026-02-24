"""
共享 fixtures：全局测试数据和基础配置
"""
import os
import sys

import pytest

# 确保 backend/ 在 path 中
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture
def sample_targets():
    """最小目标集"""
    return {
        "注册目标": 500,
        "付费目标": 100,
        "金额目标": 50000,
        "客单价": 850,
        "目标转化率": 0.23,
        "约课率目标": 0.77,
        "出席率目标": 0.66,
        "时间进度": 0.5,
        "触达率目标": 0.80,
        "参与率目标": 0.50,
    }


@pytest.fixture
def sample_data():
    """35源最小数据集 mock"""
    return {
        "leads": {
            "leads_achievement": {
                "by_channel": {
                    "总计": {"注册": 350, "预约": 200, "出席": 150, "付费": 80},
                    "CC窄口径": {"注册": 100, "预约": 60, "出席": 45, "付费": 25},
                    "SS窄口径": {"注册": 80, "预约": 50, "出席": 38, "付费": 20},
                    "LP窄口径": {"注册": 70, "预约": 40, "出席": 30, "付费": 15},
                    "宽口径": {"注册": 100, "预约": 50, "出席": 37, "付费": 20},
                }
            },
            "leads_detail": {"records": []},
        },
        "order": {
            "order_detail": {
                "summary": {
                    "total_orders": 90,
                    "new_orders": 70,
                    "renewal_orders": 20,
                    "total_revenue_cny": 300000.0,
                    "total_revenue_usd": 40000.0,
                    "avg_order_value": 500.0,
                },
                "referral_cc_new": {"count": 60, "revenue_cny": 200000.0, "revenue_usd": 30000.0},
                "by_channel": {
                    "转介绍": {"revenue_cny": 200000.0, "revenue_usd": 30000.0}
                },
                "by_team": {
                    "THCC-A": {"revenue_usd": 15000.0},
                    "THCC-B": {"revenue_usd": 15000.0},
                    "SS1": {"revenue_usd": 5000.0},
                },
                "records": [],
            },
            "cc_attendance": [{"active_5min": 10}],
            "ss_attendance": [{"active_5min": 5}],
            "order_daily_trend": [],
            "revenue_daily_trend": [],
            "package_ratio": {},
            "team_package_ratio": {"by_team": []},
            "channel_revenue": {"by_channel_product": []},
        },
        "kpi": {
            "north_star_24h": {
                "summary": {
                    "avg_checkin_24h_rate": 0.25,
                    "target": 0.60,
                }
            },
            "enclosure_combined": {
                "total": {
                    "active_students": 1000,
                    "participation_rate": 0.12,
                    "conversion_rate": 0.35,
                }
            },
            "enclosure_referral": {"total": {}},
            "by_cc": [],
        },
        "ops": {
            "trial_followup": {"records": []},
            "pre_class_outreach": {"records": []},
        },
        "outreach": {"overall": {}, "by_cc": []},
        "cohort": {},
        "enclosure": {},
    }


@pytest.fixture
def report_date():
    from datetime import datetime

    return datetime(2026, 2, 15)


@pytest.fixture
def analyzer_context(sample_data, sample_targets, report_date):
    """创建 AnalyzerContext 实例"""
    from core.analyzers.context import AnalyzerContext

    return AnalyzerContext(
        data=sample_data,
        targets=sample_targets,
        report_date=report_date,
    )


@pytest.fixture
def minimal_summary():
    """最小 summary 结构（用于 ImpactChainEngine）"""
    return {
        "registration": {"actual": 350},
        "payment": {"actual": 80},
        "checkin_24h": {"rate": 0.25, "target": 0.60},
    }


@pytest.fixture
def minimal_funnel():
    """最小 funnel 结构（用于 ImpactChainEngine）"""
    return {
        "total": {
            "register": 350,
            "reserve": 200,
            "attend": 150,
            "paid": 80,
            "valid_students": 1000,
            "rates": {
                "reserve_rate": 0.57,
                "attend_rate": 0.75,
                "register_paid_rate": 0.23,
                "contact_rate": 0.35,
                "participation_rate": 0.12,
            },
        }
    }
