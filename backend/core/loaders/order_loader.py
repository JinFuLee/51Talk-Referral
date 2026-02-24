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

            # 向量化清洗日期列
            df["_date"] = self._clean_date_vec(df["calldate"])
            df = df[df["_date"].notna()].copy()

            if df.empty:
                return []

            df["_active_5min"] = self._clean_numeric_vec(df["active_5min"])
            df["_active_30min"] = self._clean_numeric_vec(df["active_30min"])

            records = (
                df[["_date", "_active_5min", "_active_30min"]]
                .rename(columns={
                    "_date": "date",
                    "_active_5min": "active_5min",
                    "_active_30min": "active_30min",
                })
                .to_dict("records")
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

            # 别名规范化（向量化）
            if "sale_dept_name" in df.columns:
                df["sale_dept_name"] = df["sale_dept_name"].apply(
                    lambda v: self._normalize_alias(str(v)) if pd.notna(v) else v
                )

            # 过滤无效 student_id
            if "stdt_id" in df.columns:
                df = df[df["stdt_id"].apply(
                    lambda v: not (pd.isna(v) if not isinstance(v, str) else False)
                )].copy()

            if df.empty:
                return self._empty_order_detail()

            # 向量化构建所有清洗字段
            df["_date"] = self._clean_date_vec(df["deal_time_day"])
            df["_student_id"] = df["stdt_id"].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )
            df["_team"] = df["sale_dept_name"].apply(
                lambda v: self._normalize_team(str(v).strip())
            )
            df["_seller"] = df["sale_name"].apply(
                lambda v: str(v).strip() or None if pd.notna(v) else None
            )
            df["_channel"] = df["chnl_type"].apply(
                lambda v: str(v).strip() or None if pd.notna(v) else None
            )
            df["_order_tag"] = df["order_tag"].apply(
                lambda v: str(v).strip() or None if pd.notna(v) else None
            )
            df["_product"] = df["product_name"].apply(
                lambda v: str(v).strip() or None if pd.notna(v) else None
            )
            df["_amount_thb"] = self._clean_numeric_vec(df["pay_amt"])
            df["_amount_cny"] = self._clean_numeric_vec(df["pay_amt_cny"])
            df["_amount_usd"] = self._clean_numeric_vec(df["pay_amt_usd"])
            df["_order_id"] = df["ord_id"].apply(
                lambda v: str(v).strip() or None if pd.notna(v) else None
            )
            df["_order_type"] = df["nml_type"].apply(
                lambda v: str(v).strip() or None if pd.notna(v) else None
            )

            clean_cols = {
                "_student_id": "student_id",
                "_team": "team",
                "_seller": "seller",
                "_channel": "channel",
                "_order_tag": "order_tag",
                "_product": "product",
                "_date": "date",
                "_amount_thb": "amount_thb",
                "_amount_cny": "amount_cny",
                "_amount_usd": "amount_usd",
                "_order_id": "order_id",
                "_order_type": "order_type",
            }
            records_df = df[list(clean_cols.keys())].rename(columns=clean_cols)
            records = records_df.to_dict("records")

            # 汇总维度（基于向量化 DataFrame 操作）
            by_team = self._aggregate_orders_by_team_df(records_df)
            by_channel = self._aggregate_orders_by_channel_df(records_df)
            by_date = self._aggregate_orders_by_date_df(records_df)
            summary = self._summarize_orders_df(records_df)
            referral_cc_new = self._aggregate_referral_cc_new_df(records_df)

            return {
                "records": records,
                "by_team": by_team,
                "by_channel": by_channel,
                "by_date": by_date,
                "summary": summary,
                "referral_cc_new": referral_cc_new,
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
            "referral_cc_new": {
                "count": 0,
                "revenue_usd": 0.0,
                "revenue_cny": 0.0,
                "revenue_thb": 0.0,
                "by_cc": [],
            },
        }

    # ── 向量化聚合方法（基于已清洗的 DataFrame）──────────────────────── #

    def _aggregate_orders_by_team_df(self, df: pd.DataFrame) -> dict:
        """向量化按团队聚合"""
        grp = df.assign(team=df["team"].fillna("未知")).groupby("team", as_index=False).agg(
            count=("team", "count"),
            revenue_cny=("amount_cny", "sum"),
            revenue_usd=("amount_usd", "sum"),
        )
        return {
            row["team"]: {
                "count": int(row["count"]),
                "revenue_cny": float(row["revenue_cny"]),
                "revenue_usd": float(row["revenue_usd"]),
            }
            for _, row in grp.iterrows()
        }

    def _aggregate_orders_by_channel_df(self, df: pd.DataFrame) -> dict:
        """向量化按渠道聚合"""
        grp = df.assign(channel=df["channel"].fillna("未知")).groupby("channel", as_index=False).agg(
            count=("channel", "count"),
            revenue_cny=("amount_cny", "sum"),
            revenue_usd=("amount_usd", "sum"),
        )
        return {
            row["channel"]: {
                "count": int(row["count"]),
                "revenue_cny": float(row["revenue_cny"]),
                "revenue_usd": float(row["revenue_usd"]),
            }
            for _, row in grp.iterrows()
        }

    def _aggregate_referral_cc_new_df(self, df: pd.DataFrame) -> dict:
        """仅统计 CC前端 + 新单 + 转介绍 的订单（核心业绩计算，过滤条件严格保持）"""
        mask = (
            (df["channel"].fillna("") == "转介绍")
            & (df["team"].fillna("").str.upper().str.contains("CC", na=False))
            & (df["order_tag"].fillna("") == "新单")
        )
        filtered = df[mask]
        return {
            "count": int(len(filtered)),
            "revenue_cny": float(filtered["amount_cny"].sum()),
            "revenue_usd": float(filtered["amount_usd"].sum()),
            "revenue_thb": float(filtered["amount_thb"].sum()),
        }

    def _aggregate_orders_by_date_df(self, df: pd.DataFrame) -> list:
        """向量化按日期聚合"""
        grp = df.assign(date=df["date"].fillna("unknown")).groupby("date", as_index=False).agg(
            count=("date", "count"),
            revenue=("amount_cny", "sum"),
        )
        grp = grp.sort_values("date")
        return [
            {"date": row["date"], "count": int(row["count"]), "revenue": float(row["revenue"])}
            for _, row in grp.iterrows()
        ]

    def _summarize_orders_df(self, df: pd.DataFrame) -> dict:
        """向量化订单汇总"""
        return {
            "total_orders": int(len(df)),
            "total_revenue_cny": round(float(df["amount_cny"].sum()), 2),
            "total_revenue_usd": round(float(df["amount_usd"].sum()), 2),
            "new_orders": int((df["order_tag"].fillna("") == "新单").sum()),
            "renewal_orders": int((df["order_tag"].fillna("") == "续单").sum()),
        }

    # 以下旧方法保留（仍接受 list 参数，供外部调用兼容）──────────────── #

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

    def _aggregate_referral_cc_new(self, records: list) -> dict:
        """仅统计 CC前端 + 新单 + 转介绍 的订单"""
        result = {"count": 0, "revenue_cny": 0.0, "revenue_usd": 0.0, "revenue_thb": 0.0}
        for r in records:
            channel = (r.get("channel") or "").strip()
            team = (r.get("team") or r.get("sale_dept_name") or "").upper()
            order_tag = (r.get("order_tag") or "").strip()
            if channel == "转介绍" and "CC" in team and order_tag == "新单":
                result["count"] += 1
                result["revenue_cny"] += r.get("amount_cny") or 0.0
                result["revenue_usd"] += r.get("amount_usd") or 0.0
                result["revenue_thb"] += r.get("amount_thb") or 0.0
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

            # 向量化清洗
            df["_date"] = self._clean_date_vec(df["deal_time_day"])
            df = df[df["_date"].notna()].copy()
            if df.empty:
                return []

            df["_product_type"] = df["product_type"].apply(
                lambda v: str(v).strip() or None if pd.notna(v) else None
            )
            df["_order_count"] = self._clean_numeric_vec(df["order_count"])

            return (
                df[["_date", "_product_type", "_order_count"]]
                .rename(columns={
                    "_date": "date",
                    "_product_type": "product_type",
                    "_order_count": "order_count",
                })
                .to_dict("records")
            )

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

            # 向量化清洗
            df["_date"] = self._clean_date_vec(df["deal_time_day"])
            df = df[df["_date"].notna()].copy()
            if df.empty:
                return []

            df["_product_type"] = df["product_type"].apply(
                lambda v: str(v).strip() or None if pd.notna(v) else None
            )
            df["_revenue_cny"] = self._clean_numeric_vec(df["revenue_cny"])

            return (
                df[["_date", "_product_type", "_revenue_cny"]]
                .rename(columns={
                    "_date": "date",
                    "_product_type": "product_type",
                    "_revenue_cny": "revenue_cny",
                })
                .to_dict("records")
            )

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
            # 双层表头：header=[0,1]，合并；表头预处理保留 Python
            df = self._read_xlsx_pandas(path, header=[0, 1])
            if df.empty:
                return {"by_channel": {}}

            # 展平多级列头（保留原有逻辑）
            df.columns = [
                "_".join(str(c).strip() for c in col if str(c) != "nan").strip("_")
                for col in df.columns
            ]

            # 向量化：按列名判断数值/字符串，整列 apply
            records_df = pd.DataFrame()
            for col in df.columns:
                if self._is_numeric_col(col):
                    records_df[col] = self._clean_numeric_vec(df[col])
                else:
                    records_df[col] = df[col].apply(lambda v: str(v).strip() if pd.notna(v) else str(v))

            return {"by_channel": {"records": records_df.to_dict("records")}}

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
            # E7 有 3 行表头（row0/row1/row2），用 header=None 读取后手动跳过
            df_raw = self._read_xlsx_pandas(path, header=None)
            if df_raw.empty:
                return {"by_team": []}

            # 跳过前 3 行表头，第 4 行起为数据
            df = df_raw.iloc[3:].reset_index(drop=True)

            # 用前两行拼合列名（row0 ffill + row1）
            header_row0 = df_raw.iloc[0].ffill().tolist()
            header_row1 = df_raw.iloc[1].tolist()
            col_names = [
                "_".join(str(c).strip() for c in [h0, h1] if str(c).strip() not in ("nan", "")).strip("_")
                for h0, h1 in zip(header_row0, header_row1)
            ]
            # 去重：若列名重复则追加序号
            seen: dict = {}
            deduped = []
            for name in col_names:
                if name in seen:
                    seen[name] += 1
                    deduped.append(f"{name}_{seen[name]}")
                else:
                    seen[name] = 0
                    deduped.append(name)
            df.columns = deduped

            # 向量化：按列名判断数值/字符串，整列 apply
            records_df = pd.DataFrame()
            for col in df.columns:
                if self._is_numeric_col(col):
                    records_df[col] = self._clean_numeric_vec(df[col])
                else:
                    records_df[col] = df[col].apply(lambda v: str(v).strip() if pd.notna(v) else str(v))

            return {"by_team": records_df.to_dict("records")}

        except Exception as e:
            logger.error(f"[E7] 加载失败: {e}", exc_info=True)
            return {"by_team": []}

    # ------------------------------------------------------------------ #
    # E8: BI-订单_套餐分渠道金额_D-1（XML 可能损坏；_read_xlsx_pandas 自动 fallback 到 calamine）
    # ------------------------------------------------------------------ #

    def _load_channel_revenue(self) -> dict:
        subdir = "BI-订单_套餐分渠道金额_D-1"
        path = self._find_latest_file(subdir)
        if path is None:
            logger.warning(f"[E8] 未找到文件: {subdir}")
            return {}

        # 经 BaseLoader 缓存层读取：openpyxl 优先，损坏 XML 自动 fallback 到 calamine
        df = self._read_xlsx_pandas(path)
        if df.empty:
            logger.warning(f"[E8] 读取结果为空，返回空字典")
            return {}

        try:
            # 向量化：每列独立清洗（数值列用 _clean_numeric，其他转字符串）
            records_df = pd.DataFrame()
            for col in df.columns:
                col_str = str(col)
                series = df[col]
                # 判断是否为数值类型列（按 dtype 或列名）
                if pd.api.types.is_numeric_dtype(series):
                    records_df[col_str] = self._clean_numeric_vec(series)
                else:
                    records_df[col_str] = series.apply(
                        lambda v: None if (pd.isna(v) if not isinstance(v, (list, dict, str)) else False)
                        else (self._clean_numeric(v) if self._clean_numeric(v) is not None else str(v).strip())
                    )

            return {"by_channel_product": records_df.to_dict("records")}

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
