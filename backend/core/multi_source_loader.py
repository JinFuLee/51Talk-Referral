"""
35源统一数据编排器
所有 A/B/C/D/E/F 类数据源通过各自 Loader 加载后统一汇总

并行化控制：
  环境变量 PARALLEL_LOADERS=0  → 强制串行（调试/兼容回退）
  环境变量 PARALLEL_LOADERS=1  → 并行（默认）
"""

import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from concurrent.futures import TimeoutError as FuturesTimeout
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, Optional

from .loaders import (
    CohortLoader,
    KpiLoader,
    LeadsLoader,
    OpsLoader,
    OrderLoader,
    ROILoader,
)

if TYPE_CHECKING:
    from .project_config import ProjectConfig

logger = logging.getLogger(__name__)

# 并行加载超时（秒）— 6 个 Loader × 最慢单源约 8s，留 2× 余量
_PARALLEL_TIMEOUT_SECS = 60


def _parallel_enabled() -> bool:
    """读取 PARALLEL_LOADERS 环境变量，默认开启（"0" 表示关闭）。"""
    return os.environ.get("PARALLEL_LOADERS", "1").strip() != "0"


class MultiSourceLoader:
    """统一加载所有 35 个数据源。

    默认使用 ThreadPoolExecutor 并行加载 6 个子 Loader，I/O bound 场景预期加速 ~60%。
    设置环境变量 PARALLEL_LOADERS=0 可回退到串行模式（兼容性 / 调试用途）。
    """

    def __init__(
        self, input_dir: str, project_config: Optional["ProjectConfig"] = None
    ) -> None:
        self.input_dir = Path(input_dir)
        self._loaders: Dict[str, Any] = {
            "leads": LeadsLoader(self.input_dir, project_config),
            "roi": ROILoader(self.input_dir, project_config),
            "cohort": CohortLoader(self.input_dir, project_config),
            "kpi": KpiLoader(self.input_dir, project_config),
            "order": OrderLoader(self.input_dir, project_config),
            "ops": OpsLoader(self.input_dir, project_config),
        }

    # ------------------------------------------------------------------ #
    # 公开接口
    # ------------------------------------------------------------------ #

    def load_all(self) -> Dict[str, Any]:
        """加载全部 35 源，返回统一数据字典。

        并行模式（默认）：各 Loader 在独立线程执行，单 Loader 失败不影响其余。
        timeout 60s 触发后：已完成的 Loader 结果保留，超时 Loader 置空 {}。
        若并行模式整体异常（非单 Loader 异常），自动 fallback 到串行模式并记录告警。
        """
        if not _parallel_enabled():
            logger.info("PARALLEL_LOADERS=0，使用串行模式加载")
            return self._load_serial()

        logger.info(
            f"并行加载 {len(self._loaders)} 个 Loader（timeout={_PARALLEL_TIMEOUT_SECS}s）"
        )
        try:
            return self._load_parallel()
        except Exception as exc:
            logger.warning(
                f"并行加载遭遇意外异常（{exc!r}），自动 fallback 到串行模式",
                exc_info=True,
            )
            return self._load_serial()

    def load_category(self, category: str) -> Dict[str, Any]:
        """按类别加载单类数据源。"""
        loader = self._loaders.get(category)
        if not loader:
            raise ValueError(
                f"未知类别: {category}，可用: {list(self._loaders.keys())}"
            )
        return loader.load_all()

    # ------------------------------------------------------------------ #
    # 内部实现
    # ------------------------------------------------------------------ #

    def _load_parallel(self) -> Dict[str, Any]:
        """ThreadPoolExecutor 并行加载，错误隔离 + timeout 保护。"""
        data: Dict[str, Any] = {}
        with ThreadPoolExecutor(max_workers=len(self._loaders)) as executor:
            future_to_name: Dict[Any, str] = {
                executor.submit(loader.load_all): name
                for name, loader in self._loaders.items()
            }
            try:
                for future in as_completed(
                    future_to_name, timeout=_PARALLEL_TIMEOUT_SECS
                ):
                    name = future_to_name[future]
                    try:
                        data[name] = future.result()
                        logger.info(f"[{name}] 加载成功（并行）")
                    except Exception as loader_exc:
                        logger.error(
                            f"[{name}] 加载失败（并行）: {loader_exc}", exc_info=True
                        )
                        data[name] = {}
            except FuturesTimeout:
                logger.error(
                    f"部分 Loader 在 {_PARALLEL_TIMEOUT_SECS}s 内未完成，"
                    "已完成的结果保留，超时 Loader 置空 {}"
                )
                # 收集已完成的 future 结果，超时未完成的置空并取消
                for future, name in future_to_name.items():
                    if name in data:
                        # 已在上方正常循环中处理
                        continue
                    if future.done():
                        try:
                            data[name] = future.result()
                            logger.info(f"[{name}] timeout 后收集到结果（并行）")
                        except Exception as loader_exc:
                            logger.error(f"[{name}] timeout 后结果异常: {loader_exc}")
                            data[name] = {}
                    else:
                        future.cancel()
                        logger.warning(f"[{name}] 超时取消，置空 {{}}")
                        data[name] = {}
        return data

    def _load_serial(self) -> Dict[str, Any]:
        """串行加载（fallback / PARALLEL_LOADERS=0 时使用），单源失败不影响其他。"""
        data: Dict[str, Any] = {}
        for name, loader in self._loaders.items():
            try:
                data[name] = loader.load_all()
                logger.info(f"[{name}] 加载成功（串行）")
            except Exception as exc:
                logger.error(f"[{name}] 加载失败（串行）: {exc}", exc_info=True)
                data[name] = {}
        return data


def load_all_sources(input_dir: str) -> Dict[str, Any]:
    """加载所有数据源的便捷函数。"""
    loader = MultiSourceLoader(input_dir)
    return loader.load_all()
