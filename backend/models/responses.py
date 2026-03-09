from typing import Any, Optional

from pydantic import BaseModel


class APIResponse(BaseModel):
    success: bool = True
    data: Any = None
    error: Optional[str] = None
    message: Optional[str] = None


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
