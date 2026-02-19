"""
51Talk 转介绍周报自动生成 - 历史数据导入器
核心职责：扫描历史 Excel 文件，重放分析流程，写入快照数据库
"""
import re
import logging
from typing import List, Dict, Optional
from pathlib import Path
from datetime import datetime, timedelta

from .config import INPUT_DIR, DATA_SOURCE_DIR, get_targets
from .data_processor import XlsxReader, DataProcessor
from .analysis_engine import AnalysisEngine
from .snapshot_store import SnapshotStore


logger = logging.getLogger(__name__)


class HistoryImporter:
    """历史数据导入器"""

    def __init__(self, input_dir: Optional[str] = None):
        """
        初始化导入器

        Args:
            input_dir: 数据源目录（默认使用 config.INPUT_DIR）
        """
        self.input_dirs = []

        # 添加 input 目录
        if input_dir:
            self.input_dirs.append(Path(input_dir))
        else:
            self.input_dirs.append(INPUT_DIR)

        # 添加数据源目录
        if DATA_SOURCE_DIR.exists():
            self.input_dirs.append(DATA_SOURCE_DIR)

        self.store = SnapshotStore()

    def scan_files(self) -> List[tuple]:
        """
        扫描历史 Excel 文件

        Returns:
            (file_path, date) 列表
        """
        files_with_dates = []

        for input_dir in self.input_dirs:
            if not input_dir.exists():
                logger.warning(f"目录不存在: {input_dir}")
                continue

            # 查找所有 xlsx 文件
            for file_path in input_dir.glob("*.xlsx"):
                # 跳过临时文件
                if file_path.name.startswith("~$"):
                    continue

                # 尝试从文件名提取日期 (YYYYMMDD)
                date_match = re.search(r"(\d{8})", file_path.name)
                if date_match:
                    try:
                        file_date = datetime.strptime(date_match.group(1), "%Y%m%d")
                        files_with_dates.append((file_path, file_date))
                    except ValueError:
                        logger.warning(f"无法解析日期: {file_path.name}")
                else:
                    logger.debug(f"跳过无日期标记的文件: {file_path.name}")

        # 按日期排序
        files_with_dates.sort(key=lambda x: x[1])

        return files_with_dates

    def import_all(self) -> Dict[str, int]:
        """
        导入所有历史文件

        Returns:
            统计信息 {"imported": N, "skipped": M, "failed": K}
        """
        files = self.scan_files()

        stats = {
            "imported": 0,
            "skipped": 0,
            "failed": 0,
            "total": len(files),
        }

        logger.info(f"找到 {len(files)} 个历史文件")

        for file_path, file_date in files:
            try:
                logger.info(f"处理: {file_path.name} (日期: {file_date.strftime('%Y-%m-%d')})")

                # 导入单个文件
                success = self.import_single(file_path, file_date)

                if success:
                    stats["imported"] += 1
                    logger.info(f"✅ 成功导入: {file_path.name}")
                else:
                    stats["skipped"] += 1
                    logger.warning(f"⏭️  跳过: {file_path.name}")

            except Exception as e:
                stats["failed"] += 1
                logger.error(f"❌ 导入失败: {file_path.name} - {e}")
                # 继续处理下一个文件
                continue

        logger.info(f"导入完成: {stats}")
        return stats

    def import_single(self, file_path: Path, date: datetime) -> bool:
        """
        处理单个文件并写入快照数据库

        Args:
            file_path: Excel 文件路径
            date: 数据日期

        Returns:
            是否成功导入
        """
        # 读取 Excel
        reader = XlsxReader(str(file_path))

        if not reader.all_rows:
            logger.warning(f"文件为空: {file_path.name}")
            return False

        # 数据处理
        processor = DataProcessor(reader)

        # 分析引擎
        engine = AnalysisEngine(processor)

        # 获取目标配置（使用业务数据日期 T-1）
        target_date = date - timedelta(days=1)
        targets = get_targets(date=target_date)

        # 执行分析（不包含多数据源）
        # 注意：历史数据可能没有多数据源文件，这里简化处理
        analysis_result = engine.analyze(targets, date, multi_source_data=None)

        # 保存快照
        self.store.save_snapshot(analysis_result, date)

        return True
