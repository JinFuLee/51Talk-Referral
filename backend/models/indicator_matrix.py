"""
指标矩阵数据模型
定义各岗位（CC/SS/LP）的指标配置结构
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class IndicatorDef(BaseModel):
    id: str
    name_zh: str
    name_th: str
    category: Literal[
        "result",
        "achievement",
        "process",
        "efficiency",
        "process_wide",
        "conversion",
        "service_pre_paid",
        "service_post_paid",
    ]
    unit: Literal["currency_usd", "percent", "count", "ratio"]
    formula: str | None = None
    data_source: str = "TBD"
    has_target: bool = False
    target_key: str | None = None
    availability: Literal["available", "pending", "partial"] = "available"


class RoleMatrix(BaseModel):
    readonly: bool = False
    enclosure: str = ""
    scope: str = ""
    active: list[str]


class IndicatorMatrixConfig(BaseModel):
    CC: RoleMatrix
    SS: RoleMatrix
    LP: RoleMatrix


class MatrixUpdateBody(BaseModel):
    active: list[str]
