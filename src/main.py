#!/usr/bin/env python3
"""
51Talk 转介绍周报自动生成 - 主程序入口

使用方法:
1. 监控模式（持续运行）:
   python main.py --watch
   
2. 单次处理模式:
   python main.py --once /path/to/data.xlsx
   
3. 处理最新文件:
   python main.py --latest
"""
import re
import argparse
import sys
import logging
from pathlib import Path
from datetime import datetime, timedelta

from logging.handlers import RotatingFileHandler
from config import INPUT_DIR, OUTPUT_DIR, DATA_SOURCE_DIR, LOG_DIR, get_targets
from data_processor import XlsxReader, DataProcessor
from report_generator import ReportGenerator, generate_report
from file_watcher import create_watcher, WATCHDOG_AVAILABLE


# 配置日志
def setup_logging():
    log_file = LOG_DIR / "app.log"
    
    # 格式
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # File Handler (Rotating)
    file_handler = RotatingFileHandler(
        log_file, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)
    
    # Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    
    # Root Logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    # 清除旧的 handlers 避免重复
    root_logger.handlers = []
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    return logging.getLogger(__name__)

logger = setup_logging()


def process_file(file_path: str, output_dir: Path = OUTPUT_DIR) -> Path:
    """
    处理单个数据源文件并生成报告
    
    Args:
        file_path: 数据源Excel文件路径
        output_dir: 输出目录
    
    Returns:
        生成的报告文件路径
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"文件不存在: {file_path}")
    
    logger.info(f"开始处理: {file_path.name}")
    
    # 尝试从文件名提取日期 (格式: YYYYMMDD)
    date_match = re.search(r"(\d{8})", file_path.name)
    report_date = None
    if date_match:
        try:
            report_date = datetime.strptime(date_match.group(1), "%Y%m%d")
            logger.info(f"📅 识别到报表日期: {report_date.strftime('%Y-%m-%d')}")
        except ValueError:
            logger.warning("无法解析文件名中的日期，将使用当前时间")
    
    # 生成输出文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = f"运营分析报告_{timestamp}.xlsx"
    output_path = output_dir / output_filename
    
    # 获取目标配置（自动计算时间进度）
    # 如果提取到了日期，则使用提取的日期；否则 config.py 内部默认使用 now()
    # 修正: 用户要求BM计算逻辑应该使用业务数据日期(T-1)，而非报表生成日期(T)
    # 且根据回测，用户期望的66%对应的是再前推一天的数据(T-2的逻辑)，或者这里的report_date本身就是T
    # 我们将传入 date - timedelta(days=1) 以匹配用户的期望值 (22日 -> 66%)
    target_date = report_date - timedelta(days=1) if report_date else None
    targets = get_targets(date=target_date)
    logger.info(f"⏱️  时间进度: {targets['时间进度']:.1%}")
    
    # 生成报告
    result_path = generate_report(str(file_path), str(output_path), targets)
    
    logger.info(f"✅ 已生成: {result_path.name}")
    print(f"\n✅ 报告生成成功!")
    print(f"📄 {result_path}")
    
    return result_path


def find_latest_data_file() -> Path:
    """查找最新的数据源文件"""
    # 先检查input目录
    xlsx_files = list(INPUT_DIR.glob("*.xlsx"))
    
    # 再检查数据源目录
    if not xlsx_files and DATA_SOURCE_DIR.exists():
        xlsx_files = list(DATA_SOURCE_DIR.glob("*转介绍*.xlsx"))
    
    # 过滤掉临时文件 (以 ~$ 开头)
    xlsx_files = [f for f in xlsx_files if not f.name.startswith("~$")]
    
    if not xlsx_files:
        raise FileNotFoundError("未找到数据源文件")
    
    # 按修改时间排序，返回最新的
    xlsx_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
    return xlsx_files[0]


def watch_mode():
    """监控模式：持续监控input目录"""
    print("=" * 50)
    print("  51Talk 转介绍周报自动生成程序")
    print("=" * 50)
    
    def on_new_file(file_path: str):
        try:
            process_file(file_path)
        except Exception as e:
            logger.error(f"处理文件失败: {e}")
            print(f"❌ 处理失败: {e}")
    
    # 创建监控器 (优先使用轮询模式，更稳定)
    watcher = create_watcher(str(INPUT_DIR), on_new_file, use_polling=True)
    watcher.start()


def main():
    parser = argparse.ArgumentParser(
        description="51Talk 转介绍周报自动生成程序",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python main.py --watch          # 监控模式，持续运行
  python main.py --once data.xlsx # 处理单个文件
  python main.py --latest         # 处理最新的数据源文件
        """
    )
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        '--watch', '-w',
        action='store_true',
        help='监控模式：持续监控input目录，自动处理新文件'
    )
    group.add_argument(
        '--once', '-o',
        metavar='FILE',
        help='单次模式：处理指定的数据源文件'
    )
    group.add_argument(
        '--latest', '-l',
        action='store_true',
        help='处理最新的数据源文件'
    )
    
    parser.add_argument(
        '--output-dir',
        type=Path,
        default=OUTPUT_DIR,
        help=f'输出目录 (默认: {OUTPUT_DIR})'
    )
    
    args = parser.parse_args()
    
    # 确保输出目录存在
    args.output_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        if args.watch:
            watch_mode()
        elif args.once:
            process_file(args.once, args.output_dir)
        elif args.latest:
            latest_file = find_latest_data_file()
            print(f"🔍 找到最新文件: {latest_file.name}")
            process_file(str(latest_file), args.output_dir)
    
    except FileNotFoundError as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n程序已退出")
        sys.exit(0)
    except Exception as e:
        logger.exception("程序运行出错")
        print(f"❌ 程序出错: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
