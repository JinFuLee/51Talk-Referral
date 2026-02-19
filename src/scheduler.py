"""定时报告生成调度器"""
import json
import logging
import time
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

class ReportScheduler:
    def __init__(self, config_path: str = None):
        if config_path is None:
            config_path = str(Path(__file__).resolve().parent.parent / "config" / "schedule.json")
        self.config = self._load_config(config_path)
        self.notifier = None

    def _load_config(self, path) -> dict:
        defaults = {"enabled": True, "cron": "09:00", "timezone": "Asia/Bangkok", "on_complete": ["notify"]}
        try:
            with open(path, 'r') as f:
                loaded = json.load(f)
            defaults.update(loaded)
        except FileNotFoundError:
            logger.warning(f"调度配置不存在: {path}，使用默认值")
        return defaults

    def start(self):
        """启动调度循环"""
        import schedule as sched_lib
        cron_time = self.config.get("cron", "09:00")
        sched_lib.every().day.at(cron_time).do(self.run_report_generation)
        logger.info(f"调度器启动: 每日 {cron_time} 生成报告")
        print(f"📅 调度器已启动: 每日 {cron_time} 自动生成报告")
        print("   按 Ctrl+C 退出")
        try:
            while True:
                sched_lib.run_pending()
                time.sleep(30)
        except KeyboardInterrupt:
            print("\n调度器已停止")

    def run_report_generation(self):
        """执行一次完整的报告生成流程"""
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from config import get_targets, DATA_SOURCE_DIR, OUTPUT_DIR
        from data_processor import XlsxReader, DataProcessor
        from analysis_engine import AnalysisEngine
        from md_report_generator import MarkdownReportGenerator
        from multi_source_loader import MultiSourceLoader

        report_date = datetime.now()
        logger.info(f"[调度] 开始生成报告: {report_date.strftime('%Y-%m-%d %H:%M')}")

        try:
            # 1. 加载主数据源
            data_files = list(Path(DATA_SOURCE_DIR).glob("*转介绍不同口径对比*/*.xlsx"))
            data_files = [f for f in data_files if not f.name.startswith("~$")]
            if not data_files:
                logger.error("[调度] 未找到口径对比数据源")
                return
            data_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
            latest = data_files[0]

            # 2. 处理数据
            reader = XlsxReader(str(latest))
            processor = DataProcessor(reader)

            # 3. 获取目标配置
            targets = get_targets(date=report_date)

            # 4. 多源加载
            loader = MultiSourceLoader(str(DATA_SOURCE_DIR))
            multi_data = loader.load_all()

            # 5. 分析
            engine = AnalysisEngine(processor)
            analysis = engine.analyze(targets, report_date, multi_data)

            # 6. 生成报告
            ops_path = OUTPUT_DIR / f"referral-review-ops-{report_date.strftime('%Y%m%d')}.md"
            exec_path = OUTPUT_DIR / f"referral-review-exec-{report_date.strftime('%Y%m%d')}.md"
            generator = MarkdownReportGenerator(analysis, OUTPUT_DIR)
            generator.generate_both()

            logger.info(f"[调度] 报告生成完成: {ops_path.name}, {exec_path.name}")

            # 7. 通知
            if "notify" in self.config.get("on_complete", []):
                self._notify(str(ops_path), analysis.get("risk_alerts", []))

            # 8. 异常预警即时通知
            high_alerts = [a for a in analysis.get("risk_alerts", []) if "🔴" in a.get("级别", "")]
            if high_alerts:
                self._alert(high_alerts)

        except Exception as e:
            logger.exception(f"[调度] 报告生成失败: {e}")

    def _notify(self, report_path, alerts):
        """报告完成后通知"""
        try:
            from notifier import Notifier
            if self.notifier is None:
                self.notifier = Notifier()
            self.notifier.send(report_path, alerts)
        except Exception as e:
            logger.warning(f"[调度] 通知发送失败: {e}")

    def _alert(self, high_alerts):
        """高级别预警即时通知"""
        try:
            from notifier import Notifier
            if self.notifier is None:
                self.notifier = Notifier()
            self.notifier.send_alert(high_alerts)
        except Exception as e:
            logger.warning(f"[调度] 预警通知失败: {e}")
