from pydantic import BaseModel
from typing import Optional, Dict, Any


class PanelConfig(BaseModel):
    language: str = "zh"
    role: str = "ops"
    input_dir: str = "./input"
    output_dir: str = "./output"
    exchange_rate: float = 35.0
    selected_month: Optional[str] = None


class MonthlyTarget(BaseModel):
    month: str
    reg_target: int = 0
    paid_target: int = 0
    amount_target: float = 0.0
    conv_rate_target: float = 0.0


class ExchangeRateUpdate(BaseModel):
    rate: float
