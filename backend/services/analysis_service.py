"""
AnalysisService — 分析引擎单例服务
封装 AnalysisEngineV2 + MultiSourceLoader 的调用，
为 API 端点提供统一缓存接口（5 分钟 TTL 内存缓存）
"""
from __future__ import annotations

import sys
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 300  # 5 分钟


class AnalysisService:
    """
    单例服务，由 main.py 在 startup 时初始化后注入各路由模块。

    职责：
      - run(): 读取 35 源数据 → 调用 AnalysisEngineV2 → 缓存结果
      - get_cached_result(): 返回最新缓存（无则 None）
      - invalidate_cache(): 手动清除缓存
    """

    def __init__(self, project_root: Path) -> None:
        self.project_root = Path(project_root)
        self.backend_dir = Path(__file__).resolve().parent.parent
        sys.path.insert(0, str(self.project_root))
        sys.path.insert(0, str(self.backend_dir))  # 使 from core.xxx 可解析
        self._cached_result: Optional[dict[str, Any]] = None
        self._last_run_at: Optional[datetime] = None

    # ── Public API ────────────────────────────────────────────────────────────

    def get_cached_result(self) -> Optional[dict[str, Any]]:
        """返回最近一次 run() 的分析结果，尚未运行则返回 None"""
        return self._cached_result

    def invalidate_cache(self) -> None:
        """手动清除缓存，下次 run() 会重新计算"""
        self._cached_result = None
        self._last_run_at = None

    def _is_cache_valid(self) -> bool:
        """检查缓存是否在 TTL 内"""
        if self._cached_result is None or self._last_run_at is None:
            return False
        elapsed = (datetime.now() - self._last_run_at).total_seconds()
        return elapsed < CACHE_TTL_SECONDS

    def run(
        self,
        input_dir: Optional[str] = None,
        report_date: Optional[str] = None,
        lang: str = "zh",
        targets: Optional[dict[str, Any]] = None,
        force: bool = False,
    ) -> dict[str, Any]:
        """
        执行完整 35 源分析流程并缓存结果。
        若缓存在 TTL 内且 force=False，直接返回缓存。

        Args:
            input_dir:   数据源目录（默认 project_root/input）
            report_date: 报告日期 YYYY-MM-DD（默认今天）
            lang:        语言 zh/th（引擎层暂未使用，保留参数）
            targets:     月度目标覆盖（None 则从 config 读取）
            force:       True 时忽略 TTL 强制重算

        Returns:
            包含分析摘要信息的 dict（完整结果见 get_cached_result()）
        """
        # TTL 缓存命中
        if not force and self._is_cache_valid():
            logger.info("缓存命中（TTL 内），跳过重算")
            return self._build_run_summary()

        from core.analysis_engine_v2 import AnalysisEngineV2
        from core.multi_source_loader import MultiSourceLoader
        from core.config import get_targets as cfg_get_targets

        # 解析参数
        effective_input_dir = Path(input_dir) if input_dir else self.project_root / "input"
        effective_date = (
            datetime.strptime(report_date, "%Y-%m-%d") if report_date else datetime.now()
        )

        # 月度目标
        if targets is None:
            targets = cfg_get_targets(effective_date)
        else:
            base = cfg_get_targets(effective_date)
            base.update(targets)
            targets = base

        # 加载 35 源数据
        logger.info(f"开始加载 35 源数据，input_dir={effective_input_dir}")
        loader = MultiSourceLoader(input_dir=str(effective_input_dir))
        data = loader.load_all()

        # 执行 V2 引擎分析
        engine = AnalysisEngineV2(data, targets, effective_date)
        result = engine.analyze()

        # 缓存
        self._cached_result = result
        self._last_run_at = datetime.now()
        logger.info("AnalysisEngineV2 分析完成，结果已缓存")

        # 生成快照（优雅降级）
        try:
            from core.snapshot_store import SnapshotStore
            store = SnapshotStore()
            store.save_snapshot(result, effective_date)
        except Exception as e:
            logger.warning(f"快照保存失败（非阻塞）: {e}")

        return self._build_run_summary()

    # ── Private ───────────────────────────────────────────────────────────────

    def _build_run_summary(self) -> dict[str, Any]:
        """从缓存结果中提取运行摘要（用于 POST /run 响应）"""
        if not self._cached_result:
            return {}
        result = self._cached_result
        meta = result.get("meta", {})
        summary_block = result.get("summary", {})

        key_metrics: dict[str, Any] = {}
        for k, v in summary_block.items():
            if isinstance(v, dict):
                key_metrics[k] = {
                    "actual":   v.get("actual"),
                    "target":   v.get("target"),
                    "gap":      v.get("gap"),
                    "status":   v.get("status"),
                }

        return {
            "run_at":         self._last_run_at.isoformat() if self._last_run_at else None,
            "data_date":      str(meta.get("data_date", "")),
            "current_month":  meta.get("current_month"),
            "time_progress":  result.get("time_progress"),
            "key_metrics":    key_metrics,
            "engine":         "AnalysisEngineV2",
        }
