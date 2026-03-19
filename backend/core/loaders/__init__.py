"""数据加载器包"""

from .base import BaseLoader
from .detail_loader import DetailLoader
from .enclosure_cc_loader import EnclosureCCLoader
from .high_potential_loader import HighPotentialLoader
from .result_loader import ResultLoader
from .student_loader import StudentLoader
from .target_loader import TargetLoader

__all__ = [
    "BaseLoader",
    "ResultLoader",
    "EnclosureCCLoader",
    "DetailLoader",
    "StudentLoader",
    "HighPotentialLoader",
    "TargetLoader",
]
