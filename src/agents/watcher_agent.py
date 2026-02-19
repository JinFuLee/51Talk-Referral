"""
文件监控代理
监控 Downloads 目录，检测到BI源文件后自动触发规划表生成
"""
import re
import time
import logging
import threading
from pathlib import Path
from datetime import datetime
from typing import Callable

from agents.planning_config import DOWNLOADS_DIR, SOURCE_PATTERN, OUTPUT_PATH

logger = logging.getLogger(__name__)

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    WATCHDOG_OK = True
except ImportError:
    WATCHDOG_OK = False


class DownloadWatchHandler(FileSystemEventHandler):
    """监控 Downloads 目录中的 BI 源文件"""

    # 文件名模式: 泰国运营数据看板__宣宣_转介绍不同口径对比_YYYYMMDD_HHMM.xlsx
    FILENAME_RE = re.compile(r"泰国运营数据看板__宣宣_转介绍不同口径对比_(\d{8})_(\d{4})\.xlsx$")

    def __init__(self, callback: Callable[[str, datetime], None], debounce_sec: float = 3.0):
        super().__init__()
        self.callback = callback
        self.debounce_sec = debounce_sec
        self.processed = set()
        self._pending = {}
        self._lock = threading.Lock()

    def on_created(self, event):
        if event.is_directory:
            return
        self._check_file(event.src_path)

    def on_modified(self, event):
        if event.is_directory:
            return
        with self._lock:
            if event.src_path in self._pending:
                self._pending[event.src_path] = time.time()

    def _check_file(self, file_path: str):
        name = Path(file_path).name
        m = self.FILENAME_RE.match(name)
        if not m:
            return

        # 跳过临时文件
        if name.startswith("~$") or name.startswith("."):
            return

        logger.info(f"检测到BI源文件: {name}")

        with self._lock:
            self._pending[file_path] = time.time()

        # 防抖后处理
        def delayed():
            time.sleep(self.debounce_sec)
            with self._lock:
                if file_path not in self._pending:
                    return
                last = self._pending.get(file_path, 0)
                if time.time() - last < self.debounce_sec:
                    return
                del self._pending[file_path]
                if file_path in self.processed:
                    logger.debug(f"已处理过，跳过: {file_path}")
                    return
                self.processed.add(file_path)

            # 解析日期
            date_str = m.group(1)
            try:
                report_date = datetime.strptime(date_str, "%Y%m%d")
            except ValueError:
                report_date = datetime.now()

            try:
                self.callback(file_path, report_date)
            except Exception as e:
                logger.error(f"处理失败: {e}", exc_info=True)
                self.processed.discard(file_path)

        t = threading.Thread(target=delayed, daemon=True)
        t.start()


class DownloadPollingWatcher:
    """轮询式监控 (备选方案)"""

    FILENAME_RE = re.compile(r"泰国运营数据看板__宣宣_转介绍不同口径对比_(\d{8})_(\d{4})\.xlsx$")

    def __init__(self, callback: Callable[[str, datetime], None], poll_interval: float = 5.0):
        self.callback = callback
        self.poll_interval = poll_interval
        self.processed = set()
        self._running = False
        self.watch_dir = DOWNLOADS_DIR

        # 记录已有文件
        self._scan_existing()

    def _scan_existing(self):
        for f in self.watch_dir.glob("泰国运营数据看板__宣宣_转介绍不同口径对比_*.xlsx"):
            if not f.name.startswith("~$"):
                self.processed.add(str(f))

    def start(self):
        self._running = True
        print(f"\n✅ 规划表监控已启动（轮询模式）")
        print(f"📁 监控目录: {self.watch_dir}")
        print(f"📄 输出目标: {OUTPUT_PATH}")
        print(f"⏹️  Ctrl+C 停止\n")

        while self._running:
            try:
                for f in self.watch_dir.glob("泰国运营数据看板__宣宣_转介绍不同口径对比_*.xlsx"):
                    fstr = str(f)
                    if f.name.startswith("~$") or fstr in self.processed:
                        continue

                    # 等文件写完
                    s1 = f.stat().st_size
                    time.sleep(1.5)
                    if not f.exists():
                        continue
                    s2 = f.stat().st_size
                    if s1 != s2 or s1 == 0:
                        continue

                    self.processed.add(fstr)
                    m = self.FILENAME_RE.match(f.name)
                    if m:
                        try:
                            report_date = datetime.strptime(m.group(1), "%Y%m%d")
                        except ValueError:
                            report_date = datetime.now()

                        print(f"🔍 检测到新文件: {f.name}")
                        try:
                            self.callback(fstr, report_date)
                        except Exception as e:
                            print(f"❌ 处理失败: {e}")
                            self.processed.discard(fstr)

                time.sleep(self.poll_interval)
            except KeyboardInterrupt:
                break

        print("\n监控已停止")

    def stop(self):
        self._running = False


def create_download_watcher(callback, use_polling=False):
    """创建 Downloads 目录监控器"""
    if use_polling or not WATCHDOG_OK:
        return DownloadPollingWatcher(callback)

    # watchdog 模式
    class WatchdogWrapper:
        def __init__(self):
            self.handler = DownloadWatchHandler(callback)
            self.observer = Observer()

        def start(self):
            self.observer.schedule(self.handler, str(DOWNLOADS_DIR), recursive=False)
            self.observer.start()
            print(f"\n✅ 规划表监控已启动（watchdog模式）")
            print(f"📁 监控目录: {DOWNLOADS_DIR}")
            print(f"📄 输出目标: {OUTPUT_PATH}")
            print(f"⏹️  Ctrl+C 停止\n")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                self.observer.stop()
                self.observer.join()
                print("\n监控已停止")

        def stop(self):
            self.observer.stop()
            self.observer.join()

    return WatchdogWrapper()
