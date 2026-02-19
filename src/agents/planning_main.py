#!/usr/bin/env python3
"""
转介绍规划表 Agent - 主入口

使用方法:
  1. 监控模式（推荐）: python planning_main.py --watch
     → 监控 Downloads，BI下载后自动生成规划表

  2. 单次处理: python planning_main.py --once /path/to/source.xlsx
     → 处理指定文件，输出规划表

  3. 处理最新: python planning_main.py --latest
     → 自动找最新的BI源文件处理
"""
import sys
import argparse
import logging
import re
from pathlib import Path
from datetime import datetime
from logging.handlers import RotatingFileHandler

# 确保能导入父级模块
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.planning_config import DOWNLOADS_DIR, OUTPUT_PATH, SOURCE_PATTERN
from agents.planning_generator import generate_planning_report
from agents.watcher_agent import create_download_watcher

# === 日志 ===
LOG_DIR = Path(__file__).resolve().parent.parent.parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)


def setup_logging():
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    fh = RotatingFileHandler(
        LOG_DIR / "planning_agent.log",
        maxBytes=5 * 1024 * 1024, backupCount=3, encoding='utf-8'
    )
    fh.setFormatter(formatter)
    fh.setLevel(logging.INFO)

    ch = logging.StreamHandler()
    ch.setFormatter(formatter)
    ch.setLevel(logging.INFO)

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers = []
    root.addHandler(fh)
    root.addHandler(ch)

    return logging.getLogger(__name__)


logger = setup_logging()


def process_source(file_path: str, report_date: datetime = None):
    """处理一个BI源文件，生成规划表"""
    fp = Path(file_path)
    logger.info(f"开始处理: {fp.name}")

    if report_date is None:
        m = re.search(r"(\d{8})", fp.name)
        if m:
            try:
                report_date = datetime.strptime(m.group(1), "%Y%m%d")
            except ValueError:
                report_date = datetime.now()
        else:
            report_date = datetime.now()

    logger.info(f"📅 报表日期: {report_date.strftime('%Y-%m-%d')}")

    result = generate_planning_report(
        source_path=str(fp),
        output_path=str(OUTPUT_PATH),
        report_date=report_date,
    )

    logger.info(f"✅ 规划表已更新: {result}")
    print(f"\n✅ 规划表生成成功!")
    print(f"📄 {result}")
    return result


def find_latest_source() -> Path:
    """找到 Downloads 中最新的BI源文件"""
    files = sorted(
        DOWNLOADS_DIR.glob(SOURCE_PATTERN),
        key=lambda f: f.stat().st_mtime,
        reverse=True,
    )
    files = [f for f in files if not f.name.startswith("~$")]
    if not files:
        raise FileNotFoundError(f"在 {DOWNLOADS_DIR} 中未找到匹配的BI源文件")
    return files[0]


def watch_mode(use_polling=True):
    """监控模式"""
    print("=" * 50)
    print("  转介绍规划表 Agent - 自动监控模式")
    print("=" * 50)

    def on_new_file(file_path: str, report_date: datetime):
        try:
            process_source(file_path, report_date)
        except Exception as e:
            logger.error(f"处理失败: {e}", exc_info=True)
            print(f"❌ 处理失败: {e}")

    watcher = create_download_watcher(on_new_file, use_polling=use_polling)
    watcher.start()


def main():
    parser = argparse.ArgumentParser(
        description="转介绍规划表 Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python planning_main.py --watch          # 监控Downloads，自动处理
  python planning_main.py --once data.xlsx # 处理指定文件
  python planning_main.py --latest         # 处理最新源文件
        """
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--watch', '-w', action='store_true', help='监控模式')
    group.add_argument('--once', '-o', metavar='FILE', help='处理指定文件')
    group.add_argument('--latest', '-l', action='store_true', help='处理最新文件')

    parser.add_argument('--output', type=str, default=None, help=f'输出路径 (默认: {OUTPUT_PATH})')
    parser.add_argument('--polling', action='store_true', help='使用轮询模式监控')

    args = parser.parse_args()

    try:
        if args.watch:
            watch_mode(use_polling=args.polling)
        elif args.once:
            process_source(args.once)
        elif args.latest:
            latest = find_latest_source()
            print(f"🔍 最新源文件: {latest.name}")
            process_source(str(latest))

    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n程序已退出")
    except Exception as e:
        logger.exception("运行出错")
        print(f"❌ {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
