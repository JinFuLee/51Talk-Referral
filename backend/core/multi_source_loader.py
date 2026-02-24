"""
35源统一数据编排器
所有 A/B/C/D/E/F 类数据源通过各自 Loader 加载后统一汇总
"""
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeout
from pathlib import Path
from typing import Dict, Any, Optional, TYPE_CHECKING
import logging

from .loaders import LeadsLoader, ROILoader, CohortLoader, KpiLoader, OrderLoader, OpsLoader

if TYPE_CHECKING:
    from .project_config import ProjectConfig

logger = logging.getLogger(__name__)


class MultiSourceLoader:
    """统一加载所有 35 个数据源"""

    def __init__(self, input_dir: str, project_config: Optional["ProjectConfig"] = None) -> None:
        self.input_dir = Path(input_dir)
        self._loaders: Dict[str, Any] = {
            "leads": LeadsLoader(self.input_dir, project_config),
            "roi": ROILoader(self.input_dir, project_config),
            "cohort": CohortLoader(self.input_dir, project_config),
            "kpi": KpiLoader(self.input_dir, project_config),
            "order": OrderLoader(self.input_dir, project_config),
            "ops": OpsLoader(self.input_dir, project_config),
        }

    def load_all(self) -> Dict[str, Any]:
        """加载全部 35 源，返回统一数据字典（ThreadPoolExecutor 并行）"""
        data: Dict[str, Any] = {}
        with ThreadPoolExecutor(max_workers=len(self._loaders)) as executor:
            future_to_name = {
                executor.submit(loader.load_all): name
                for name, loader in self._loaders.items()
            }
            try:
                for future in as_completed(future_to_name, timeout=60):
                    name = future_to_name[future]
                    try:
                        data[name] = future.result()
                        logger.info(f"[{name}] 加载成功")
                    except Exception as e:
                        logger.error(f"[{name}] 加载失败: {e}")
                        data[name] = {}
            except FuturesTimeout:
                logger.error("Loader timeout: some loaders did not complete within 60s")
                for f in future_to_name:
                    if not f.done():
                        f.cancel()
                        data[future_to_name[f]] = {}
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
