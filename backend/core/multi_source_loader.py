"""
35源统一数据编排器
所有 A/B/C/D/E/F 类数据源通过各自 Loader 加载后统一汇总
"""
from pathlib import Path
from typing import Dict, Any
import logging

from .loaders import LeadsLoader, ROILoader, CohortLoader, KpiLoader, OrderLoader, OpsLoader

logger = logging.getLogger(__name__)


class MultiSourceLoader:
    """统一加载所有 35 个数据源"""

    def __init__(self, input_dir: str):
        self.input_dir = Path(input_dir)
        self._loaders: Dict[str, Any] = {
            "leads": LeadsLoader(self.input_dir),
            "roi": ROILoader(self.input_dir),
            "cohort": CohortLoader(self.input_dir),
            "kpi": KpiLoader(self.input_dir),
            "order": OrderLoader(self.input_dir),
            "ops": OpsLoader(self.input_dir),
        }

    def load_all(self) -> Dict[str, Any]:
        """加载全部 35 源，返回统一数据字典"""
        data: Dict[str, Any] = {}
        for name, loader in self._loaders.items():
            try:
                data[name] = loader.load_all()
                logger.info(f"[{name}] 加载成功")
            except Exception as e:
                logger.error(f"[{name}] 加载失败: {e}")
                data[name] = {}
        return data

    def load_category(self, category: str) -> Dict[str, Any]:
        """按类别加载单类数据源"""
        loader = self._loaders.get(category)
        if not loader:
            raise ValueError(f"未知类别: {category}，可用: {list(self._loaders.keys())}")
        return loader.load_all()


def load_all_sources(input_dir: str) -> Dict[str, Any]:
    """加载所有数据源的便捷函数"""
    loader = MultiSourceLoader(input_dir)
    return loader.load_all()
