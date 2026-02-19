"""
51Talk 转介绍周报自动生成 - 文件监控模块
监控指定目录，当有新的xlsx文件时自动触发报告生成
"""
import time
import logging
from pathlib import Path
from datetime import datetime
from typing import Callable, Optional
import threading

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileCreatedEvent
    WATCHDOG_AVAILABLE = True
except ImportError:
    WATCHDOG_AVAILABLE = False
    print("警告: watchdog库未安装，文件监控功能不可用")
    print("请运行: pip install watchdog")


logger = logging.getLogger(__name__)


class XlsxFileHandler(FileSystemEventHandler):
    """Excel文件事件处理器"""
    
    def __init__(self, callback: Callable[[str], None], debounce_seconds: float = 2.0):
        """
        Args:
            callback: 当检测到新xlsx文件时调用的回调函数
            debounce_seconds: 防抖时间，避免文件写入过程中被触发
        """
        super().__init__()
        self.callback = callback
        self.debounce_seconds = debounce_seconds
        self.processed_files = set()
        self._pending_files = {}
        self._lock = threading.Lock()
    
    def on_created(self, event):
        """文件创建事件"""
        if event.is_directory:
            return
        
        file_path = Path(event.src_path)
        
        # 只处理xlsx文件，排除临时文件
        if not file_path.suffix.lower() == '.xlsx':
            return
        if file_path.name.startswith('~$') or file_path.name.startswith('.'):
            return
        
        logger.info(f"检测到新文件: {file_path.name}")
        
        # 使用防抖机制
        self._schedule_processing(str(file_path))
    
    def on_modified(self, event):
        """文件修改事件（可能是文件复制完成）"""
        if event.is_directory:
            return
        
        file_path = Path(event.src_path)
        
        if not file_path.suffix.lower() == '.xlsx':
            return
        if file_path.name.startswith('~$') or file_path.name.startswith('.'):
            return
        
        # 如果文件在待处理列表中，重置计时器
        with self._lock:
            if str(file_path) in self._pending_files:
                self._pending_files[str(file_path)] = time.time()
    
    def _schedule_processing(self, file_path: str):
        """调度文件处理（带防抖）"""
        with self._lock:
            self._pending_files[file_path] = time.time()
        
        # 启动定时检查
        def check_and_process():
            time.sleep(self.debounce_seconds)
            with self._lock:
                if file_path not in self._pending_files:
                    return
                
                last_modified = self._pending_files.get(file_path, 0)
                if time.time() - last_modified >= self.debounce_seconds:
                    del self._pending_files[file_path]
                    
                    # 检查是否已处理过
                    if file_path in self.processed_files:
                        logger.debug(f"文件已处理过，跳过: {file_path}")
                        return
                    
                    self.processed_files.add(file_path)
                    
                    # 调用回调
                    try:
                        self.callback(file_path)
                    except Exception as e:
                        logger.error(f"处理文件时出错: {e}")
                        self.processed_files.discard(file_path)
        
        thread = threading.Thread(target=check_and_process)
        thread.daemon = True
        thread.start()


class FileWatcher:
    """文件监控器"""
    
    def __init__(
        self,
        watch_dir: str,
        callback: Callable[[str], None],
        debounce_seconds: float = 2.0
    ):
        """
        Args:
            watch_dir: 要监控的目录
            callback: 当检测到新xlsx文件时调用的回调函数
            debounce_seconds: 防抖时间
        """
        if not WATCHDOG_AVAILABLE:
            raise ImportError("watchdog库未安装，请运行: pip install watchdog")
        
        self.watch_dir = Path(watch_dir)
        self.callback = callback
        self.debounce_seconds = debounce_seconds
        self.observer = None
        
        # 确保目录存在
        self.watch_dir.mkdir(parents=True, exist_ok=True)
    
    def start(self):
        """开始监控"""
        event_handler = XlsxFileHandler(self.callback, self.debounce_seconds)
        self.observer = Observer()
        self.observer.schedule(event_handler, str(self.watch_dir), recursive=False)
        self.observer.start()
        
        logger.info(f"开始监控目录: {self.watch_dir}")
        print(f"\n✅ 文件监控已启动")
        print(f"📁 监控目录: {self.watch_dir}")
        print(f"📝 请将数据源Excel文件放入上述目录")
        print(f"⏹️  按 Ctrl+C 停止监控\n")
    
    def stop(self):
        """停止监控"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            logger.info("文件监控已停止")
    
    def run_forever(self):
        """持续运行直到被中断"""
        self.start()
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n正在停止监控...")
            self.stop()
            print("监控已停止")


class SimplePollingWatcher:
    """简单的轮询式文件监控器（不依赖watchdog）"""
    
    def __init__(
        self,
        watch_dir: str,
        callback: Callable[[str], None],
        poll_interval: float = 3.0
    ):
        self.watch_dir = Path(watch_dir)
        self.callback = callback
        self.poll_interval = poll_interval
        self.processed_files = set()
        self._running = False
        
        # 确保目录存在
        self.watch_dir.mkdir(parents=True, exist_ok=True)
        
        # 记录已存在的文件
        self._scan_existing_files()
    
    def _scan_existing_files(self):
        """扫描已存在的文件"""
        for file in self.watch_dir.glob("*.xlsx"):
            if not file.name.startswith('~$') and not file.name.startswith('.'):
                self.processed_files.add(str(file))
    
    def start(self):
        """开始监控"""
        self._running = True
        
        print(f"\n✅ 文件监控已启动（轮询模式）")
        print(f"📁 监控目录: {self.watch_dir}")
        print(f"📝 请将数据源Excel文件放入上述目录")
        print(f"⏹️  按 Ctrl+C 停止监控\n")
        
        while self._running:
            try:
                for file in self.watch_dir.glob("*.xlsx"):
                    file_str = str(file)
                    
                    # 跳过临时文件和已处理文件
                    if file.name.startswith('~$') or file.name.startswith('.'):
                        continue
                    if file_str in self.processed_files:
                        continue
                    
                    # 检查文件是否完整（大小不再变化）
                    size1 = file.stat().st_size
                    time.sleep(1)
                    if not file.exists():
                        continue
                    size2 = file.stat().st_size
                    
                    if size1 == size2 and size1 > 0:
                        print(f"🔍 检测到新文件: {file.name}")
                        self.processed_files.add(file_str)
                        
                        try:
                            self.callback(file_str)
                        except Exception as e:
                            print(f"❌ 处理文件时出错: {e}")
                            self.processed_files.discard(file_str)
                
                time.sleep(self.poll_interval)
                
            except KeyboardInterrupt:
                break
        
        print("\n监控已停止")
    
    def stop(self):
        """停止监控"""
        self._running = False


def create_watcher(
    watch_dir: str,
    callback: Callable[[str], None],
    use_polling: bool = False
) -> object:
    """
    创建文件监控器
    
    Args:
        watch_dir: 监控目录
        callback: 回调函数
        use_polling: 是否使用轮询模式（不需要watchdog）
    
    Returns:
        FileWatcher 或 SimplePollingWatcher 实例
    """
    if use_polling or not WATCHDOG_AVAILABLE:
        return SimplePollingWatcher(watch_dir, callback)
    else:
        return FileWatcher(watch_dir, callback)


if __name__ == "__main__":
    # 测试代码
    logging.basicConfig(level=logging.INFO)
    
    def test_callback(file_path):
        print(f"处理文件: {file_path}")
    
    watch_dir = "/Users/felixmacbookairm4/Desktop/Antigravity/Project/51talk/周报自动生成/input"
    watcher = create_watcher(watch_dir, test_callback, use_polling=True)
    watcher.start()
