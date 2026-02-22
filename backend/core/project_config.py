"""
多项目配置层 — ProjectConfig Pydantic schema + JSON 加载器

用法:
    from backend.core.project_config import load_project_config
    cfg = load_project_config("referral")
    print(cfg.project_name, cfg.display_name)
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class WorkScheduleConfig(BaseModel):
    """工作日权重配置"""
    rest_weekdays: List[int] = Field(
        default=[2],
        description="休息日星期编号列表（0=周一, 2=周三, ...）"
    )
    weekend_multiplier: float = Field(
        default=1.4,
        description="周末权重倍数"
    )
    day_weights: Dict[str, float] = Field(
        default_factory=lambda: {
            "0": 1.0, "1": 1.0, "2": 0.0,
            "3": 1.0, "4": 1.0, "5": 1.4, "6": 1.4
        },
        description="每周各天权重（key 为星期编号字符串，0=周一）"
    )


class ProjectConfig(BaseModel):
    """单项目业务配置 schema"""

    project_name: str = Field(description="项目标识符，如 'referral'")
    display_name: str = Field(description="项目显示名称，如 '51Talk 泰国转介绍'")

    monthly_targets: Dict[str, Any] = Field(
        default_factory=dict,
        description="月度目标配置，key 格式 'YYYYMM'"
    )
    column_mapping: Dict[str, Dict[str, str]] = Field(
        default_factory=dict,
        description="Excel 列映射，按口径分组"
    )

    work_schedule: WorkScheduleConfig = Field(
        default_factory=WorkScheduleConfig,
        description="工作日/权重配置"
    )

    exchange_rate: Dict[str, float] = Field(
        default_factory=lambda: {"THB_USD": 34.0, "CNY_USD": 8.0},
        description="汇率配置，key 格式 'FROM_TO'"
    )

    roi_cost_config: Dict[str, Any] = Field(
        default_factory=dict,
        description="ROI 成本模型配置"
    )

    role_aliases: Dict[str, str] = Field(
        default_factory=lambda: {"EA": "SS", "ea": "SS", "CM": "LP", "cm": "LP"},
        description="角色别名映射（原始数据别名 → 标准展示名）"
    )
    default_team_name: str = Field(
        default="THCC",
        description="数据中占位符（'-'/空）映射到的默认团队名"
    )

    channel_labels: List[str] = Field(
        default_factory=lambda: ["CC窄口径", "SS窄口径", "LP窄口径", "宽口径"],
        description="渠道/口径标签列表"
    )

    gap_thresholds: Dict[str, float] = Field(
        default_factory=lambda: {"green": 0.0, "yellow": -0.05},
        description="进度差阈值（green≥0, yellow>=-5%）"
    )

    anomaly_config: Dict[str, Any] = Field(
        default_factory=lambda: {
            "std_threshold": 2.0,
            "decline_threshold": 0.3,
            "conversion_floor": 0.05,
            "rest_days": [2],
        },
        description="异常检测配置"
    )

    ltv_config: Dict[str, float] = Field(
        default_factory=lambda: {
            "default_renewal_rate": 0.3,
            "narrow_renewal_rate": 0.4,
            "wide_renewal_rate": 0.25,
        },
        description="LTV 分析配置"
    )

    enabled_modules: List[str] = Field(
        default_factory=list,
        description="启用的分析模块白名单"
    )
    enabled_routers: List[str] = Field(
        default_factory=list,
        description="启用的 API 路由白名单"
    )


_PROJECTS_DIR = Path(__file__).resolve().parent.parent.parent / "projects"


def load_project_config(project_name: str = "referral") -> ProjectConfig:
    """
    从 projects/{project_name}/config.json 加载项目配置。

    Args:
        project_name: 项目目录名，默认 'referral'

    Returns:
        ProjectConfig 实例

    Raises:
        FileNotFoundError: 配置文件不存在
        ValueError: JSON 格式无效或字段校验失败
    """
    config_path = _PROJECTS_DIR / project_name / "config.json"

    if not config_path.exists():
        raise FileNotFoundError(
            f"项目配置文件不存在: {config_path}\n"
            f"请在 projects/{project_name}/config.json 中创建配置。"
        )

    try:
        raw = json.loads(config_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise ValueError(f"配置文件 JSON 格式无效: {config_path}\n{e}") from e

    return ProjectConfig(**raw)
