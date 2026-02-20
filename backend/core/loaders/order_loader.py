"""E类 Order/Revenue 数据加载器"""
from pathlib import Path
from typing import Optional
import logging

import pandas as pd

from .base import BaseLoader

logger = logging.getLogger(__name__)


class OrderLoader(BaseLoader):
    """加载 E 类订单/业绩相关 Excel 文件"""

    # ------------------------------------------------------------------ #
    # 公开入口
    # ------------------------------------------------------------------ #

    def load_all(self) -> dict:
        return {
            "cc_attendance": self._load_attendance("BI-订单_CC上班人数_D-1"),
            "ss_attendance": self._load_attendance("BI-订单_SS上班人数_D-1"),
            "order_detail": self._load_order_detail(),
            "order_daily_trend": self._load_daily_trend(),
            "revenue_daily_trend": self._load_revenue_trend(),
            "package_ratio": self._load_package_ratio(),
            "team_package_ratio": self._load_team_package_ratio(),
            "channel_revenue": self._load_channel_revenue(),
        }

    # ------------------------------------------------------------------ #
    # E1 / E2: 上班人数（CC / SS）
    # ------------------------------------------------------------------ #

    def _load_attendance(self, subdir: str) -> list:
        path = self._find_latest_file(subdir)
        if path is None:
            logger.warning(f"[E1/E2] 未找到文件: {subdir}")
            return []

        try:
            df = self._read_xlsx_pandas(path)
            if df.empty:
                return []

            # 统一列名：calldate(day), >=5min, >=30min（按位置）
            cols = list(df.columns)
            col_map = {
                cols[0]: "calldate",
                cols[1]: "active_5min",
                cols[2]: "active_30min",
            }
            df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

            records = []
            for _, row in df.iterrows():
                date_val = self._clean_date(row.get("calldate"))
                if date_val is None:
                    continue
                records.append(
                    {
                        "date": date_val,
                        "active_5min": self._clean_numeric(row.get("active_5min")),
                        "active_30min": self._clean_numeric(row.get("active_30min")),
                    }
                )
            return records

        except Exception as e:
            logger.error(f"[E1/E2] 加载失败 {subdir}: {e}", exc_info=True)
            return []

    # ------------------------------------------------------------------ #
    # E3: BI-订单_明细_D-1
    # ------------------------------------------------------------------ #

    def _load_order_detail(self) -> dict:
        subdir = "BI-订单_明细_D-1"
        path = self._find_latest_file(subdir)
        if path is None:
            logger.warning(f"[E3] 未找到文件: {subdir}")
            return self._empty_order_detail()

        try:
            df = self._read_xlsx_pandas(path)
            if df.empty:
                return self._empty_order_detail()

            # 标准化列名（按位置，兼容不同版本表头）
            cols = list(df.columns)
            # 期望顺序: region, sale_dept_name, sale_name, stdt_id, occup_desc,
            #           chnl_type, order_tag, product_name, deal_time, deal_time_day,
            #           deal_time_hms, pay_amt, ord_id, pay_amt_cny, pay_amt_usd, nml_type
            col_names = [
                "region", "sale_dept_name", "sale_name", "stdt_id", "occup_desc",
                "chnl_type", "order_tag", "product_name", "deal_time", "deal_time_day",
                "deal_time_hms", "pay_amt", "ord_id", "pay_amt_cny", "pay_amt_usd", "nml_type",
            ]
            col_map = {cols[i]: col_names[i] for i in range(min(len(cols), len(col_names)))}
            df = df.rename(columns=col_map)

            # 别名规范化
            if "sale_dept_name" in df.columns:
                df["sale_dept_name"] = df["sale_dept_name"].apply(
                    lambda v: self._normalize_alias(str(v)) if pd.notna(v) else v
                )

            records = []
            for _, row in df.iterrows():
                date_val = self._clean_date(row.get("deal_time_day"))
                student_id = row.get("stdt_id")
                if pd.isna(student_id) if not isinstance(student_id, str) else False:
                    continue
                records.append(
                    {
                        "student_id": str(student_id).strip()
                        if pd.notna(student_id)
                        else None,
                        "team": str(row.get("sale_dept_name", "")).strip() or None,
                        "seller": str(row.get("sale_name", "")).strip() or None,
                        "channel": str(row.get("chnl_type", "")).strip() or None,
                        "order_tag": str(row.get("order_tag", "")).strip() or None,
                        "product": str(row.get("product_name", "")).strip() or None,
                        "date": date_val,
                        "amount_thb": self._clean_numeric(row.get("pay_amt")),
                        "amount_cny": self._clean_numeric(row.get("pay_amt_cny")),
                        "amount_usd": self._clean_numeric(row.get("pay_amt_usd")),
                        "order_id": str(row.get("ord_id", "")).strip() or None,
                        "order_type": str(row.get("nml_type", "")).strip() or None,
                    }
                )

            # 汇总维度
            by_team = self._aggregate_orders_by_team(records)
            by_channel = self._aggregate_orders_by_channel(records)
            by_date = self._aggregate_orders_by_date(records)
            summary = self._summarize_orders(records)

            return {
                "records": records,
                "by_team": by_team,
                "by_channel": by_channel,
                "by_date": by_date,
                "summary": summary,
            }

        except Exception as e:
            logger.error(f"[E3] 加载失败: {e}", exc_info=True)
            return self._empty_order_detail()

    def _empty_order_detail(self) -> dict:
        return {
            "records": [],
            "by_team": {},
            "by_channel": {},
            "by_date": [],
            "summary": {
                "total_orders": 0,
                "total_revenue_cny": 0.0,
                "total_revenue_usd": 0.0,
                "new_orders": 0,
                "renewal_orders": 0,
            },
        }

    def _aggregate_orders_by_team(self, records: list) -> dict:
        result: dict = {}
        for r in records:
            team = r.get("team") or "未知"
            if team not in result:
                result[team] = {"count": 0, "revenue_cny": 0.0, "revenue_usd": 0.0}
            result[team]["count"] += 1
            result[team]["revenue_cny"] += r.get("amount_cny") or 0.0
            result[team]["revenue_usd"] += r.get("amount_usd") or 0.0
        return result

    def _aggregate_orders_by_channel(self, records: list) -> dict:
        result: dict = {}
        for r in records:
            ch = r.get("channel") or "未知"
            if ch not in result:
                result[ch] = {"count": 0, "revenue_cny": 0.0, "revenue_usd": 0.0}
            result[ch]["count"] += 1
            result[ch]["revenue_cny"] += r.get("amount_cny") or 0.0
            result[ch]["revenue_usd"] += r.get("amount_usd") or 0.0
        return result

    def _aggregate_orders_by_date(self, records: list) -> list:
        daily: dict = {}
        for r in records:
            d = r.get("date") or "unknown"
            if d not in daily:
                daily[d] = {"date": d, "count": 0, "revenue": 0.0}
            daily[d]["count"] += 1
            daily[d]["revenue"] += r.get("amount_cny") or 0.0
        return sorted(daily.values(), key=lambda x: x["date"])

    def _summarize_orders(self, records: list) -> dict:
        total_cny = sum(r.get("amount_cny") or 0.0 for r in records)
        total_usd = sum(r.get("amount_usd") or 0.0 for r in records)
        new_orders = sum(1 for r in records if r.get("order_tag") == "新单")
        renewal_orders = sum(1 for r in records if r.get("order_tag") == "续单")
        return {
            "total_orders": len(records),
            "total_revenue_cny": round(total_cny, 2),
            "total_revenue_usd": round(total_usd, 2),
            "new_orders": new_orders,
            "renewal_orders": renewal_orders,
        }

    # ------------------------------------------------------------------ #
    # E4: BI-订单_套餐类型订单日趋势_D-1
    # ------------------------------------------------------------------ #

    def _load_daily_trend(self) -> list:
        subdir = "BI-订单_套餐类型订单日趋势_D-1"
        path = self._find_latest_file(subdir)
        if path is None:
            logger.warning(f"[E4] 未找到文件: {subdir}")
            return []

        try:
            df = self._read_xlsx_pandas(path)
            if df.empty:
                return []

            cols = list(df.columns)
            col_map = {
                cols[0]: "deal_time_day",
                cols[1]: "product_type",
                cols[2]: "order_count",
            }
            df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

            records = []
            for _, row in df.iterrows():
                date_val = self._clean_date(row.get("deal_time_day"))
                if date_val is None:
                    continue
                records.append(
                    {
                        "date": date_val,
                        "product_type": str(row.get("product_type", "")).strip() or None,
                        "order_count": self._clean_numeric(row.get("order_count")),
                    }
                )
            return records

        except Exception as e:
            logger.error(f"[E4] 加载失败: {e}", exc_info=True)
            return []

    # ------------------------------------------------------------------ #
    # E5: BI-订单_业绩日趋势_D-1
    # ------------------------------------------------------------------ #

    def _load_revenue_trend(self) -> list:
        subdir = "BI-订单_业绩日趋势_D-1"
        path = self._find_latest_file(subdir)
        if path is None:
            logger.warning(f"[E5] 未找到文件: {subdir}")
            return []

        try:
            df = self._read_xlsx_pandas(path)
            if df.empty:
                return []

            cols = list(df.columns)
            col_map = {
                cols[0]: "deal_time_day",
                cols[1]: "product_type",
                cols[2]: "revenue_cny",
            }
            df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

            records = []
            for _, row in df.iterrows():
                date_val = self._clean_date(row.get("deal_time_day"))
                if date_val is None:
                    continue
                records.append(
                    {
                        "date": date_val,
                        "product_type": str(row.get("product_type", "")).strip() or None,
                        "revenue_cny": self._clean_numeric(row.get("revenue_cny")),
                    }
                )
            return records

        except Exception as e:
            logger.error(f"[E5] 加载失败: {e}", exc_info=True)
            return []

    # ------------------------------------------------------------------ #
    # E6: BI-订单_套餐类型占比_D-1
    # ------------------------------------------------------------------ #

    def _load_package_ratio(self) -> dict:
        subdir = "BI-订单_套餐类型占比_D-1"
        path = self._find_latest_file(subdir)
        if path is None:
            logger.warning(f"[E6] 未找到文件: {subdir}")
            return {"by_channel": {}}

        try:
            # 双层表头：header=[0,1]，合并 6 处
            df = self._read_xlsx_pandas(path, header=[0, 1])
            if df.empty:
                return {"by_channel": {}}

            # 展平多级列头
            df.columns = [
                "_".join(str(c).strip() for c in col if str(c) != "nan").strip("_")
                for col in df.columns
            ]

            records = []
            for _, row in df.iterrows():
                rec = {}
                for col in df.columns:
                    rec[col] = self._clean_numeric(row[col]) if self._is_numeric_col(col) else str(row[col]).strip()
                records.append(rec)

            return {"by_channel": {"records": records}}

        except Exception as e:
            logger.error(f"[E6] 加载失败: {e}", exc_info=True)
            return {"by_channel": {}}

    # ------------------------------------------------------------------ #
    # E7: BI-订单_分小组套餐类型占比_D-1
    # ------------------------------------------------------------------ #

    def _load_team_package_ratio(self) -> dict:
        subdir = "BI-订单_分小组套餐类型占比_D-1"
        path = self._find_latest_file(subdir)
        if path is None:
            logger.warning(f"[E7] 未找到文件: {subdir}")
            return {"by_team": []}

        try:
            df = self._read_xlsx_pandas(path, header=[0, 1])
            if df.empty:
                return {"by_team": []}

            df.columns = [
                "_".join(str(c).strip() for c in col if str(c) != "nan").strip("_")
                for col in df.columns
            ]

            by_team = []
            for _, row in df.iterrows():
                rec = {}
                for col in df.columns:
                    val = row[col]
                    rec[col] = self._clean_numeric(val) if self._is_numeric_col(col) else str(val).strip()
                by_team.append(rec)

            return {"by_team": by_team}

        except Exception as e:
            logger.error(f"[E7] 加载失败: {e}", exc_info=True)
            return {"by_team": []}

    # ------------------------------------------------------------------ #
    # E8: BI-订单_套餐分渠道金额_D-1（XML 损坏，calamine 优先）
    # ------------------------------------------------------------------ #

    def _load_channel_revenue(self) -> dict:
        subdir = "BI-订单_套餐分渠道金额_D-1"
        path = self._find_latest_file(subdir)
        if path is None:
            logger.warning(f"[E8] 未找到文件: {subdir}")
            return {}

        # 先尝试 calamine（损坏 XML 兼容性更好）
        try:
            df = pd.read_excel(path, engine="calamine")
            if df.empty:
                raise ValueError("calamine 读取结果为空")
        except Exception as e_cal:
            logger.warning(f"[E8] calamine 读取失败，尝试 openpyxl: {e_cal}")
            try:
                df = pd.read_excel(path, engine="openpyxl")
                if df.empty:
                    raise ValueError("openpyxl 读取结果为空")
            except Exception as e_oxl:
                logger.warning(f"[E8] 所有引擎失败，返回空字典: {e_oxl}")
                return {}

        try:
            records = []
            for _, row in df.iterrows():
                rec = {}
                for col in df.columns:
                    val = row[col]
                    if pd.isna(val) if not isinstance(val, (list, dict, str)) else False:
                        rec[str(col)] = None
                    else:
                        cleaned = self._clean_numeric(val)
                        rec[str(col)] = cleaned if cleaned is not None else str(val).strip()
                records.append(rec)

            return {"by_channel_product": records}

        except Exception as e:
            logger.error(f"[E8] 解析失败: {e}", exc_info=True)
            return {}

    # ------------------------------------------------------------------ #
    # 工具方法
    # ------------------------------------------------------------------ #

    @staticmethod
    def _is_numeric_col(col_name: str) -> bool:
        """简单判断列名是否应当作数值处理"""
        numeric_hints = {
            "amt", "amount", "count", "revenue", "rate", "ratio",
            "cny", "usd", "thb", "pay", "占比", "金额", "数量",
        }
        col_lower = col_name.lower()
        return any(hint in col_lower for hint in numeric_hints)
