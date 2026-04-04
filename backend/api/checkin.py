"""打卡面板 API — 模块化 barrel

子模块：
  checkin_summary    — /checkin/summary
  checkin_ranking    — /checkin/ranking, /checkin/team-detail, /checkin/ops-student-ranking
  checkin_followup   — /checkin/followup, /checkin/followup/tsv
  checkin_insights   — /checkin/student-analysis, /checkin/enclosure-thresholds
  checkin_roi        — /checkin/roi-analysis（独立文件）
"""

from fastapi import APIRouter

from backend.api.checkin_summary import router as _summary
from backend.api.checkin_ranking import router as _ranking
from backend.api.checkin_followup import router as _followup
from backend.api.checkin_insights import router as _insights

router = APIRouter()
router.include_router(_summary)
router.include_router(_ranking)
router.include_router(_followup)
router.include_router(_insights)

# 向后兼容：checkin_roi.py 从 backend.api.checkin import 这些函数
from backend.api._checkin_config import (  # noqa: F401, E402
    _get_wide_role,
    _parse_role_enclosures,
    _get_config,
)
