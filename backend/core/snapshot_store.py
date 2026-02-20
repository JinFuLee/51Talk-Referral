"""
51Talk 转介绍周报自动生成 - 快照存储系统
核心职责：SQLite 存储每日分析结果，支持时间序列查询和历史导入
"""
import sqlite3
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from pathlib import Path
from core.config import BASE_DIR


class SnapshotStore:
    """快照存储系统，使用 SQLite 保存每日分析结果"""

    def __init__(self, project_root: Optional[Path] = None):
        """
        初始化数据库连接和表结构

        Args:
            project_root: 项目根目录（可选，默认使用 config.BASE_DIR）
        """
        # 创建 data 目录
        if project_root is not None:
            self.data_dir = Path(project_root) / "data"
        else:
            self.data_dir = BASE_DIR / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # 数据库路径
        self.db_path = self.data_dir / "snapshots.db"

        # 连接数据库
        self.conn = sqlite3.connect(
            str(self.db_path),
            check_same_thread=False,
            isolation_level=None  # autocommit mode
        )

        # 启用 WAL 模式（Write-Ahead Logging）
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA synchronous=NORMAL")

        # Row factory
        self.conn.row_factory = sqlite3.Row

        # 初始化表结构
        self._init_tables()

    def _init_tables(self):
        """创建表结构和索引"""
        cursor = self.conn.cursor()

        # 1. 每日关键指标表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_kpi (
                snapshot_date TEXT NOT NULL,
                metric TEXT NOT NULL,
                value REAL,
                time_progress REAL,
                PRIMARY KEY (snapshot_date, metric)
            )
        """)

        # 2. CC 排名快照表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cc_ranking_snapshot (
                snapshot_date TEXT NOT NULL,
                cc_name TEXT NOT NULL,
                team TEXT,
                composite REAL,
                rank INTEGER,
                leads_score REAL,
                conversion_score REAL,
                followup_score REAL,
                checkin_score REAL,
                PRIMARY KEY (snapshot_date, cc_name)
            )
        """)

        # 3. 月度聚合数据表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS monthly_aggregate (
                month TEXT PRIMARY KEY,
                data_json TEXT NOT NULL
            )
        """)

        # 4. 多数据源摘要表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS multi_source_digest (
                snapshot_date TEXT NOT NULL,
                source_type TEXT NOT NULL,
                summary_json TEXT NOT NULL,
                PRIMARY KEY (snapshot_date, source_type)
            )
        """)

        # 创建索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_daily_kpi_date
            ON daily_kpi(snapshot_date)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_cc_ranking_date
            ON cc_ranking_snapshot(snapshot_date)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_cc_ranking_composite
            ON cc_ranking_snapshot(composite DESC)
        """)

        self.conn.commit()

    def save_snapshot(self, analysis_result: dict, report_date: datetime):
        """
        保存分析结果快照到数据库

        Args:
            analysis_result: AnalysisEngine.analyze() 返回的结果字典
            report_date: 报告日期
        """
        cursor = self.conn.cursor()

        # 计算数据日期（T-1）
        data_date = (report_date - timedelta(days=1)).strftime("%Y-%m-%d")
        current_month = (report_date - timedelta(days=1)).strftime("%Y%m")

        # 1. 保存每日 KPI
        summary = analysis_result.get("summary", {})
        time_progress = analysis_result.get("time_progress", 0.0)

        kpi_metrics = ["注册", "预约", "出席", "付费", "金额"]
        for metric in kpi_metrics:
            if metric in summary:
                actual = summary[metric].get("actual", 0)
                cursor.execute("""
                    INSERT OR REPLACE INTO daily_kpi
                    (snapshot_date, metric, value, time_progress)
                    VALUES (?, ?, ?, ?)
                """, (data_date, metric, actual, time_progress))

        # 2. 保存 CC 排名快照
        cc_ranking = analysis_result.get("cc_ranking", {})
        rankings = cc_ranking.get("rankings", [])

        # 先删除该日期的旧数据
        cursor.execute("""
            DELETE FROM cc_ranking_snapshot WHERE snapshot_date = ?
        """, (data_date,))

        for entry in rankings:
            cursor.execute("""
                INSERT INTO cc_ranking_snapshot
                (snapshot_date, cc_name, team, composite, rank,
                 leads_score, conversion_score, followup_score, checkin_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data_date,
                entry.get("cc", ""),
                entry.get("team", ""),
                entry.get("composite", 0.0),
                entry.get("rank", 0),
                entry.get("leads_score", 0.0),
                entry.get("conversion_score", 0.0),
                entry.get("followup_score", 0.0),
                entry.get("checkin_score", 0.0)
            ))

        # 3. 保存月度聚合数据
        monthly_data = {
            "summary": summary,
            "prediction": analysis_result.get("prediction", {}),
        }

        cursor.execute("""
            INSERT OR REPLACE INTO monthly_aggregate (month, data_json)
            VALUES (?, ?)
        """, (current_month, json.dumps(monthly_data, ensure_ascii=False)))

        # 4. 保存多数据源摘要
        multi_source_keys = [
            "cohort_analysis",
            "checkin_analysis",
            "leads_achievement",
            "followup_analysis",
            "order_analysis",
            "mom_trend",
            "yoy_trend"
        ]

        for source_type in multi_source_keys:
            if source_type in analysis_result:
                cursor.execute("""
                    INSERT OR REPLACE INTO multi_source_digest
                    (snapshot_date, source_type, summary_json)
                    VALUES (?, ?, ?)
                """, (
                    data_date,
                    source_type,
                    json.dumps(analysis_result[source_type], ensure_ascii=False)
                ))

        self.conn.commit()

    def get_cc_history(
        self,
        cc_name: Optional[str] = None,
        limit_days: int = 90
    ) -> List[Dict]:
        """查询 CC 历史排名数据"""
        cursor = self.conn.cursor()

        if cc_name:
            cursor.execute("""
                SELECT * FROM cc_ranking_snapshot
                WHERE cc_name = ?
                AND snapshot_date >= date('now', '-' || ? || ' days')
                ORDER BY snapshot_date ASC
            """, (cc_name, limit_days))
        else:
            cursor.execute("""
                SELECT * FROM cc_ranking_snapshot
                WHERE snapshot_date >= date('now', '-' || ? || ' days')
                ORDER BY snapshot_date ASC, rank ASC
            """, (limit_days,))

        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def get_daily_kpi_series(
        self,
        month: str,
        metric: Optional[str] = None
    ) -> List[Dict]:
        """查询月度每日 KPI 时间序列"""
        cursor = self.conn.cursor()

        year = month[:4]
        mon = month[4:6]
        date_prefix = f"{year}-{mon}"

        if metric:
            cursor.execute("""
                SELECT * FROM daily_kpi
                WHERE snapshot_date LIKE ? || '%'
                AND metric = ?
                ORDER BY snapshot_date ASC
            """, (date_prefix, metric))
        else:
            cursor.execute("""
                SELECT * FROM daily_kpi
                WHERE snapshot_date LIKE ? || '%'
                ORDER BY snapshot_date ASC, metric ASC
            """, (date_prefix,))

        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def get_snapshot_dates(self) -> List[str]:
        """查询所有不重复的快照日期"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT DISTINCT snapshot_date FROM daily_kpi
            ORDER BY snapshot_date ASC
        """)
        rows = cursor.fetchall()
        return [row[0] for row in rows]

    def get_stats(self) -> Dict[str, Any]:
        """获取数据库统计信息"""
        cursor = self.conn.cursor()

        stats = {}

        # 各表行数
        table_counts = {}
        for table in ["daily_kpi", "cc_ranking_snapshot", "monthly_aggregate", "multi_source_digest"]:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            table_counts[table] = cursor.fetchone()[0]
        stats["table_counts"] = table_counts

        # 总快照数（不重复日期数）
        cursor.execute("SELECT COUNT(DISTINCT snapshot_date) FROM daily_kpi")
        stats["total_snapshots"] = cursor.fetchone()[0]

        # 最早和最晚日期
        cursor.execute("SELECT MIN(snapshot_date), MAX(snapshot_date) FROM daily_kpi")
        row = cursor.fetchone()
        stats["earliest_date"] = row[0] or "-"
        stats["latest_date"] = row[1] or "-"

        # 数据库文件大小
        if self.db_path.exists():
            size_bytes = self.db_path.stat().st_size
            stats["db_size_kb"] = round(size_bytes / 1024, 1)
            stats["db_size_mb"] = round(size_bytes / (1024 * 1024), 2)
        else:
            stats["db_size_kb"] = 0.0
            stats["db_size_mb"] = 0.0

        return stats

    def cleanup(self, days_to_keep: int = 365):
        """清理过期数据"""
        cursor = self.conn.cursor()

        cursor.execute("""
            DELETE FROM daily_kpi
            WHERE snapshot_date < date('now', '-' || ? || ' days')
        """, (days_to_keep,))

        cursor.execute("""
            DELETE FROM cc_ranking_snapshot
            WHERE snapshot_date < date('now', '-' || ? || ' days')
        """, (days_to_keep,))

        cursor.execute("""
            DELETE FROM multi_source_digest
            WHERE snapshot_date < date('now', '-' || ? || ' days')
        """, (days_to_keep,))

        self.conn.commit()
        cursor.execute("VACUUM")

    def cleanup_old_snapshots(self, days: int = 90) -> int:
        """
        清理 N 天前的快照数据（snapshots API 调用）

        Args:
            days: 保留最近 N 天，更早的数据删除

        Returns:
            删除的行数（daily_kpi 表）
        """
        cursor = self.conn.cursor()

        cursor.execute("""
            DELETE FROM daily_kpi
            WHERE snapshot_date < date('now', '-' || ? || ' days')
        """, (days,))
        deleted = cursor.rowcount

        cursor.execute("""
            DELETE FROM cc_ranking_snapshot
            WHERE snapshot_date < date('now', '-' || ? || ' days')
        """, (days,))

        cursor.execute("""
            DELETE FROM multi_source_digest
            WHERE snapshot_date < date('now', '-' || ? || ' days')
        """, (days,))

        self.conn.commit()
        return deleted

    def get_daily_kpi(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        metric: Optional[str] = None,
    ) -> List[Dict]:
        """
        查询日级 KPI（snapshots API 调用）

        Args:
            date_from: 起始日期 YYYY-MM-DD（含）
            date_to:   结束日期 YYYY-MM-DD（含）
            metric:    指标名称过滤

        Returns:
            [{snapshot_date, metric, value, time_progress}, ...]
        """
        cursor = self.conn.cursor()

        conditions = []
        params: list = []

        if date_from:
            conditions.append("snapshot_date >= ?")
            params.append(date_from)
        if date_to:
            conditions.append("snapshot_date <= ?")
            params.append(date_to)
        if metric:
            conditions.append("metric = ?")
            params.append(metric)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        cursor.execute(f"""
            SELECT snapshot_date, metric, value, time_progress
            FROM daily_kpi
            {where}
            ORDER BY snapshot_date ASC, metric ASC
        """, params)

        return [dict(row) for row in cursor.fetchall()]

    def get_cc_growth(
        self,
        cc_name: str,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> List[Dict]:
        """
        查询指定 CC 的成长曲线（snapshots API 调用）

        Args:
            cc_name:   CC 姓名
            date_from: 起始日期 YYYY-MM-DD
            date_to:   结束日期 YYYY-MM-DD

        Returns:
            [{snapshot_date, cc_name, composite, rank, ...}, ...]
        """
        cursor = self.conn.cursor()

        conditions = ["cc_name = ?"]
        params: list = [cc_name]

        if date_from:
            conditions.append("snapshot_date >= ?")
            params.append(date_from)
        if date_to:
            conditions.append("snapshot_date <= ?")
            params.append(date_to)

        where = "WHERE " + " AND ".join(conditions)
        cursor.execute(f"""
            SELECT snapshot_date, cc_name, team, composite, rank,
                   leads_score, conversion_score, followup_score, checkin_score
            FROM cc_ranking_snapshot
            {where}
            ORDER BY snapshot_date ASC
        """, params)

        return [dict(row) for row in cursor.fetchall()]

    def __del__(self):
        """关闭数据库连接"""
        if hasattr(self, 'conn'):
            self.conn.close()
