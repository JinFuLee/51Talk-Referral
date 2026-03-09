"""
51Talk 转介绍周报自动生成 - 历史数据导入器
核心职责：扫描历史 Excel 目录，使用 V2 引擎重放分析，写入快照数据库
"""

import logging
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class HistoryImporter:
    """历史数据导入器（V2 版本，使用 MultiSourceLoader + AnalysisEngineV2）"""

    def __init__(
        self, project_root: Optional[Path] = None, input_dir: Optional[str] = None
    ) -> None:
        """
        初始化导入器

        Args:
            project_root: 项目根目录（snapshots.py 传入的参数）
            input_dir:    数据源目录（可选，覆盖 project_root/input）
        """
        if project_root is not None:
            self.project_root = Path(project_root)
        else:
            # 回退：从本文件位置推断（backend/core/ -> backend/ -> project_root/）
            self.project_root = Path(__file__).resolve().parent.parent.parent

        if input_dir is not None:
            self.input_dir = Path(input_dir)
        else:
            self.input_dir = self.project_root / "input"

        self.store = self._make_store()

    # ── 内部工厂 ──────────────────────────────────────────────────────────────

    def _make_store(self) -> Optional[Any]:
        """获取 SnapshotStore 进程级单例，避免重复建立 SQLite 连接"""
        try:
            from backend.core.snapshot_store import SnapshotStore

            return SnapshotStore.get_instance()
        except Exception as e:
            logger.warning(f"SnapshotStore 初始化失败（非阻塞）: {e}")
            return None

    # ── 公共 API ──────────────────────────────────────────────────────────────

    def run(self) -> Dict[str, int]:
        """
        扫描并导入所有历史文件（snapshots.py 调用的入口）

        Returns:
            统计信息 {"imported": N, "skipped": M, "failed": K, "total": T}
        """
        return self.import_all()

    def scan_files(self) -> List[tuple]:
        """
        扫描 input_dir 中的历史 Excel 文件

        Returns:
            [(file_path, date), ...] 按日期升序排列
        """
        files_with_dates = []

        if not self.input_dir.exists():
            logger.warning(f"input 目录不存在: {self.input_dir}")
            return files_with_dates

        for file_path in self.input_dir.glob("*.xlsx"):
            if file_path.name.startswith("~$"):
                continue

            date_match = re.search(r"(\d{8})", file_path.name)
            if date_match:
                try:
                    file_date = datetime.strptime(date_match.group(1), "%Y%m%d")
                    files_with_dates.append((file_path, file_date))
                except ValueError:
                    logger.warning(f"无法解析日期: {file_path.name}")
            else:
                logger.debug(f"跳过无日期标记的文件: {file_path.name}")

        files_with_dates.sort(key=lambda x: x[1])
        return files_with_dates

    def import_all(self) -> Dict[str, int]:
        """
        导入所有历史文件

        Returns:
            统计信息 {"imported": N, "skipped": M, "failed": K, "total": T}
        """
        files = self.scan_files()

        stats: Dict[str, int] = {
            "imported": 0,
            "skipped": 0,
            "failed": 0,
            "total": len(files),
        }

        logger.info(f"找到 {len(files)} 个历史文件，开始导入...")

        for file_path, file_date in files:
            try:
                logger.info(
                    f"处理: {file_path.name} (日期: {file_date.strftime('%Y-%m-%d')})"
                )
                success = self.import_single(file_path, file_date)
                if success:
                    stats["imported"] += 1
                    logger.info(f"成功导入: {file_path.name}")
                else:
                    stats["skipped"] += 1
                    logger.warning(f"跳过: {file_path.name}")
            except Exception as e:
                stats["failed"] += 1
                logger.error(f"导入失败: {file_path.name} - {e}")
                continue

        logger.info(f"导入完成: {stats}")
        return stats

    def import_single(self, file_path: Path, date: datetime) -> bool:
        """
        处理单个文件并写入快照数据库

        使用 MultiSourceLoader 从文件所在目录加载 35 源数据，
        再调用 AnalysisEngineV2 进行分析，结果写入 SnapshotStore。

        Args:
            file_path: Excel 文件路径
            date:      数据对应的报告日期

        Returns:
            是否成功导入
        """
        from backend.core.analysis_engine_v2 import AnalysisEngineV2
        from backend.core.config import get_targets
        from backend.core.multi_source_loader import MultiSourceLoader

        # 以文件所在目录作为数据源目录（MultiSourceLoader 会扫描该目录）
        source_dir = str(file_path.parent)

        # 加载 35 源数据（允许部分源缺失，引擎有优雅降级）
        loader = MultiSourceLoader(input_dir=source_dir)
        data = loader.load_all()

        # 检查是否加载到任何数据
        if not any(data.values()):
            logger.warning(f"目录无有效数据: {source_dir}")
            return False

        # 获取月度目标（T-1 数据对应的报告日期）
        target_date = date - timedelta(days=1)
        targets = get_targets(date=target_date)

        # V2 引擎分析
        engine = AnalysisEngineV2(data, targets, date)
        analysis_result = engine.analyze()

        # 写入快照
        if self.store is not None:
            self.store.save_snapshot(analysis_result, date)
        else:
            logger.warning("SnapshotStore 不可用，跳过快照写入")
            return False

        return True
