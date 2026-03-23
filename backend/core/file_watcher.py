"""FileWatcher — 监控数据目录，自动检测新 xlsx 文件并热加载"""

from __future__ import annotations

import fnmatch
import logging
import threading
from pathlib import Path

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

logger = logging.getLogger(__name__)

# 5 个数据源的文件名匹配模式（与各 Loader 的 FILE_PATTERN 一致）
LOADER_PATTERNS: dict[str, str] = {
    "result": "*结果数据*.xlsx",
    "enclosure_cc": "*围场过程数据*byCC*.xlsx",
    "detail": "*明细*.xlsx",
    "students": "*已付费学员转介绍围场明细*.xlsx",
    "high_potential": "*高潜学员*.xlsx",
}


class _ExcelFileHandler(FileSystemEventHandler):
    """watchdog 事件处理器：检测 xlsx 文件变更，防抖后触发 DataManager 重载"""

    def __init__(self, data_manager, debounce_sec: float = 3.0) -> None:
        super().__init__()
        self._dm = data_manager
        self._debounce_sec = debounce_sec
        self._timer: threading.Timer | None = None
        self._pending_files: set[str] = set()
        self._lock = threading.Lock()

    # ── watchdog 回调 ──────────────────────────────────────────────
    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith(".xlsx"):
            self._schedule_reload(event.src_path)

    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(".xlsx"):
            self._schedule_reload(event.src_path)

    # ── 防抖调度 ──────────────────────────────────────────────────
    def _schedule_reload(self, file_path: str) -> None:
        with self._lock:
            self._pending_files.add(file_path)
            if self._timer is not None:
                self._timer.cancel()
            self._timer = threading.Timer(self._debounce_sec, self._do_reload)
            self._timer.daemon = True
            self._timer.start()

    # ── 实际重载逻辑 ─────────────────────────────────────────────
    def _do_reload(self) -> None:
        with self._lock:
            pending = self._pending_files.copy()
            self._pending_files.clear()

        if not pending:
            return

        current_files = self._dm.get_loaded_files()
        affected_sources: set[str] = set()

        for fpath in pending:
            fname = Path(fpath).name
            # 跳过隐藏文件和 Office 临时锁文件
            if fname.startswith(".") or fname.startswith("~$"):
                continue
            for src_id, pattern in LOADER_PATTERNS.items():
                # detail 排除逻辑（与 DetailLoader._find_file 一致）
                if src_id == "detail" and (
                    "围场过程" in fname or "付费学员" in fname
                ):
                    continue
                if fnmatch.fnmatch(fname, pattern):
                    affected_sources.add(src_id)

        if not affected_sources:
            logger.debug("FileWatcher: 检测到 xlsx 变更但不匹配任何数据源模式，忽略")
            return

        logger.info(
            f"FileWatcher: 检测到数据源变更 {affected_sources}，触发重载..."
        )

        # 记录旧文件路径（reload 前）
        old_files = {sid: current_files.get(sid) for sid in affected_sources}

        # invalidate + reload
        try:
            self._dm.invalidate()
            self._dm.load_all()
        except Exception:
            logger.exception("FileWatcher: 重载数据时出错")
            return

        # 对比新旧文件，删除旧版本
        new_files = self._dm.get_loaded_files()
        for sid in affected_sources:
            old_path = old_files.get(sid)
            new_path = new_files.get(sid)
            if (
                old_path is not None
                and new_path is not None
                and old_path != new_path
                and old_path.exists()
            ):
                try:
                    old_path.unlink()
                    logger.info(
                        f"FileWatcher: 已删除旧文件 {old_path.name}"
                        f" (被 {new_path.name} 替代)"
                    )
                except OSError:
                    logger.warning(
                        f"FileWatcher: 删除旧文件失败 {old_path.name}",
                        exc_info=True,
                    )


class FileWatcher:
    """管理 watchdog Observer 生命周期"""

    def __init__(self, data_manager, debounce_sec: float = 3.0) -> None:
        self._dm = data_manager
        self._observer = Observer()
        self._handler = _ExcelFileHandler(data_manager, debounce_sec)

    def start(self) -> None:
        watch_dir = str(self._dm.data_dir)
        self._observer.schedule(self._handler, watch_dir, recursive=False)
        self._observer.daemon = True
        self._observer.start()
        logger.info(f"FileWatcher 已启动，监控目录: {watch_dir}")

    def stop(self) -> None:
        self._observer.stop()
        self._observer.join(timeout=5)
        logger.info("FileWatcher 已停止")
