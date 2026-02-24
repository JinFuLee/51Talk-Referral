"""
A 类 Leads 数据加载器 — 5 个数据源
A1: BI-Leads_宽口径leads达成_D-1
A2: BI-Leads_全口径转介绍类型-当月效率_D-1
A3: BI-Leads_全口径leads明细表_D-1
A4: BI-Leads_宽口径leads达成-个人_D-1
A5: 宣萱_转介绍不同口径对比_D-1
"""
from pathlib import Path
from typing import Any, Optional, TYPE_CHECKING
import logging

from .base import BaseLoader

if TYPE_CHECKING:
    from backend.core.project_config import ProjectConfig

logger = logging.getLogger(__name__)


class LeadsLoader(BaseLoader):
    """A 类 Leads 数据加载器"""

    def __init__(self, input_dir: Path, project_config: Optional["ProjectConfig"] = None) -> None:
        super().__init__(input_dir, project_config)

    def load_all(self) -> dict:
        """加载所有 A 类数据源，单源失败不影响其他源"""
        result = {}

        try:
            result["leads_achievement"] = self._load_a1_leads_achievement()
        except Exception as e:
            logger.error(f"A1 leads_achievement 加载失败: {e}")
            result["leads_achievement"] = {}

        try:
            result["channel_efficiency"] = self._load_a2_channel_efficiency()
        except Exception as e:
            logger.error(f"A2 channel_efficiency 加载失败: {e}")
            result["channel_efficiency"] = {}

        try:
            result["leads_detail"] = self._load_a3_leads_detail()
        except Exception as e:
            logger.error(f"A3 leads_detail 加载失败: {e}")
            result["leads_detail"] = {}

        try:
            result["leads_achievement_personal"] = self._load_a4_leads_personal()
        except Exception as e:
            logger.error(f"A4 leads_personal 加载失败: {e}")
            result["leads_achievement_personal"] = {}

        try:
            result["leads_overview_trend"] = self._load_a5_overview_trend()
        except Exception as e:
            logger.error(f"A5 leads_overview_trend 加载失败: {e}")
            result["leads_overview_trend"] = {}

        return result

    # ── A1: 宽口径leads达成 ────────────────────────────────────────────
    def _load_a1_leads_achievement(self) -> dict:
        """
        A1: BI-Leads_宽口径leads达成_D-1
        Sheet: 转介绍leads达成_by_CM_EA_宽口径
        双层表头(header=[0,1])，合并单元格用 ffill 处理
        """
        import pandas as pd

        path = self._find_latest_file("BI-Leads_宽口径leads达成_D-1")
        if not path:
            logger.warning("A1: 数据文件未找到")
            return {}

        # 先用 header=None 读取原始结构，便于理解双层表头
        df_raw = self._read_xlsx_pandas(path, sheet_name="转介绍leads达成_by_CM_EA_宽口径", header=None)
        if df_raw.empty:
            return {}

        # 前两行为双层表头，第3行起为数据
        # 合并两行表头
        header_row0 = df_raw.iloc[0].ffill().tolist()
        header_row1 = df_raw.iloc[1].tolist()
        col_names = [
            f"{str(h0).strip()}_{str(h1).strip()}" if str(h1).strip() not in ("nan", "") else str(h0).strip()
            for h0, h1 in zip(header_row0, header_row1)
        ]

        df = df_raw.iloc[2:].copy()
        df.columns = col_names
        df = df.reset_index(drop=True)

        # 前向填充合并单元格列
        merge_cols = [col_names[0], col_names[1], col_names[2]]
        df = self._ffill_merged(df, merge_cols)

        # 向量化：过滤全空行
        import pandas as pd

        non_empty_mask = ~(
            df.isnull() | df.astype(str).isin(["", "nan", "None", "NaN", "-", "—"])
        ).all(axis=1)
        df_valid = df[non_empty_mask].copy()

        # 过滤 team 和 group 都为空的行（向量化）
        team_series = df_valid.iloc[:, 1].apply(
            lambda v: self._normalize_team(str(v).strip()) if pd.notna(v) else self._normalize_team("")
        )
        group_series = df_valid.iloc[:, 2].apply(
            lambda v: str(v).strip() if pd.notna(v) and str(v).strip() not in ("nan", "") else None
        )
        valid_mask = ~(team_series.apply(lambda t: not t) & group_series.isna())
        df_valid = df_valid[valid_mask].copy()

        # 预先向量化清洗数值列 (3~27)
        num_cols = df_valid.columns[3:min(28, len(df_valid.columns))]
        df_nums = df_valid[num_cols].map(self._clean_numeric)

        def _build_record(idx_pos) -> dict[str, Any]:
            row = df_valid.iloc[idx_pos]
            nums = df_nums.iloc[idx_pos].tolist()
            # 补齐到 25 个元素
            while len(nums) < 25:
                nums.append(None)

            def _chan(ch_offset) -> dict[str, Any]:
                return {
                    "注册付费率": nums[0 * 5 + ch_offset] if 0 * 5 + ch_offset < len(nums) else None,
                    "注册":       nums[1 * 5 + ch_offset] if 1 * 5 + ch_offset < len(nums) else None,
                    "预约":       nums[2 * 5 + ch_offset] if 2 * 5 + ch_offset < len(nums) else None,
                    "出席":       nums[3 * 5 + ch_offset] if 3 * 5 + ch_offset < len(nums) else None,
                    "付费":       nums[4 * 5 + ch_offset] if 4 * 5 + ch_offset < len(nums) else None,
                }

            region = str(row.iloc[0]).strip() if str(row.iloc[0]).strip() not in ("nan", "") else None
            team = self._normalize_team(str(row.iloc[1]).strip())
            group = str(row.iloc[2]).strip() if str(row.iloc[2]).strip() not in ("nan", "") else None
            return {
                "海外大区": region,
                "团队": self._normalize_alias(team) if team else None,
                "小组": group,
                "总计": _chan(0),
                "CC窄口径": _chan(1),
                "SS窄口径": _chan(2),
                "LP窄口径": _chan(3),
                "宽口径": _chan(4),
            }

        by_team = [_build_record(i) for i in range(len(df_valid))]

        # 按通道汇总（优先取全局总计行：团队=="小计" 且 小组=="小计"）
        by_channel = {}
        # 先找全局总计行（团队和小组都是"小计"或"总计"）
        global_totals = [
            rec for rec in by_team
            if rec.get("团队") in ("小计", "总计") and rec.get("小组") in ("小计", "总计")
        ]
        # 退回：任意一行团队或小组为"小计"/"总计"
        fallback_totals = [
            rec for rec in by_team
            if rec.get("团队") in ("小计", "总计") or rec.get("小组") in ("小计", "总计")
        ]
        total_rows = global_totals if global_totals else fallback_totals
        if total_rows:
            rec = total_rows[-1]  # 取最后一条（通常是最底部的全局合计）
            for ch in ("总计", "CC窄口径", "SS窄口径", "LP窄口径", "宽口径"):
                by_channel[ch] = rec.get(ch, {})

        total = by_channel.get("总计", {})

        return {
            "by_team": by_team,
            "by_channel": by_channel,
            "total": total,
        }

    # ── A2: 全口径转介绍类型-当月效率 ──────────────────────────────────
    def _load_a2_channel_efficiency(self) -> dict:
        """
        A2: BI-Leads_全口径转介绍类型-当月效率_D-1
        Sheet: CC_CM_EA_宽口径转介绍类型_当月效率
        双层表头，围场×通道×指标
        """
        path = self._find_latest_file("BI-Leads_全口径转介绍类型-当月效率_D-1")
        if not path:
            logger.warning("A2: 数据文件未找到")
            return {}

        df_raw = self._read_xlsx_pandas(
            path,
            sheet_name="CC_CM_EA_宽口径转介绍类型_当月效率",
            header=None,
        )
        if df_raw.empty:
            return {}

        # 双层表头：前两行
        header_row0 = df_raw.iloc[0].ffill().tolist()
        header_row1 = df_raw.iloc[1].tolist()
        col_names = [
            f"{str(h0).strip()}_{str(h1).strip()}" if str(h1).strip() not in ("nan", "") else str(h0).strip()
            for h0, h1 in zip(header_row0, header_row1)
        ]

        df = df_raw.iloc[2:].copy()
        df.columns = col_names
        df = df.reset_index(drop=True)
        df = self._ffill_merged(df, [col_names[0]])

        # 向量化：过滤全空行，要求 enclosure 非空
        import pandas as pd

        non_empty_mask = ~(
            df.isnull() | df.astype(str).isin(["", "nan", "None", "NaN", "-", "—"])
        ).all(axis=1)
        enc_col = df.iloc[:, 1].apply(lambda v: str(v).strip() if str(v).strip() not in ("nan", "") else None)
        valid_mask = non_empty_mask & enc_col.notna()
        df_valid = df[valid_mask].copy()

        # 预先清洗数值列 (2~31)
        num_cols = df_valid.columns[2:min(32, len(df_valid.columns))]
        df_nums = df_valid[num_cols].map(self._clean_numeric)

        def _build_enc_record(idx_pos) -> dict[str, Any]:
            row = df_valid.iloc[idx_pos]
            nums = df_nums.iloc[idx_pos].tolist()
            while len(nums) < 30:
                nums.append(None)

            def _chan(offset) -> dict[str, Any]:
                base = offset * 6
                return {
                    "带货比":  nums[base]     if base     < len(nums) else None,
                    "参与率":  nums[base + 1] if base + 1 < len(nums) else None,
                    "围场转率": nums[base + 2] if base + 2 < len(nums) else None,
                    "A学员数": nums[base + 3] if base + 3 < len(nums) else None,
                    "推荐注册": nums[base + 4] if base + 4 < len(nums) else None,
                    "推荐付费": nums[base + 5] if base + 5 < len(nums) else None,
                }

            region = str(row.iloc[0]).strip() if str(row.iloc[0]).strip() not in ("nan", "") else None
            _A2_ENC_NORMALIZE = {
                "0-30天": "0-30", "31-60天": "31-60", "61-90天": "61-90",
                "90天以上": "91-180", "小计": "小计",
            }
            enclosure_raw = str(row.iloc[1]).strip()
            enclosure = _A2_ENC_NORMALIZE.get(enclosure_raw, enclosure_raw)
            return {
                "海外大区": region,
                "围场": enclosure,
                "总计": _chan(0),
                "CC窄口径": _chan(1),
                "LP窄口径": _chan(2),
                "SS窄口径": _chan(3),
                "宽口径": _chan(4),
            }

        by_enclosure = [_build_enc_record(i) for i in range(len(df_valid))]

        # 按通道汇总
        by_channel = {}
        for rec in by_enclosure:
            if rec.get("围场") == "小计":
                for ch in ("总计", "CC窄口径", "LP窄口径", "SS窄口径", "宽口径"):
                    by_channel[ch] = rec.get(ch, {})
                break

        return {
            "by_enclosure": by_enclosure,
            "by_channel": by_channel,
        }

    # ── A3: 全口径leads明细表 ───────────────────────────────────────────
    def _load_a3_leads_detail(self) -> dict:
        """
        A3: BI-Leads_全口径leads明细表_D-1
        Sheet: CM_EA转介绍leads明细表
        扁平结构，502行×30列
        """
        import pandas as pd
        from datetime import datetime as _dt

        path = self._find_latest_file("BI-Leads_全口径leads明细表_D-1")
        if not path:
            logger.warning("A3: 数据文件未找到")
            return {}

        df = self._read_xlsx_pandas(path, sheet_name="CM_EA转介绍leads明细表", header=0)
        if df.empty:
            return {}

        # 列名清洗
        df.columns = [str(c).strip() for c in df.columns]

        # 当月 YYYY-MM 前缀，用于过滤付费日期（T-1 数据，使用当前月份）
        _now = _dt.now()
        _report_month_prefix = _now.strftime("%Y-%m")

        # 实际列名映射（处理列名变体）
        col_map = {c: c for c in df.columns}
        for c in df.columns:
            if "末次" in c and "分配CC员工姓名" in c:
                col_map["末次分配CC员工姓名"] = c
            if "末次" in c and "分配CC员工组名称" in c:
                col_map["末次分配CC组名称"] = c
            if "末次" in c and "分配CC员工ID" in c:
                col_map["末次分配CC员工ID"] = c
            if "首次分配CC员工姓名" in c and "末次" not in c:
                col_map["首次分配CC员工姓名"] = c
            if "首次分配CC员工组名称" in c or ("首次分配CC" in c and "组" in c and "末次" not in c):
                col_map["首次分配CC组名称"] = c
            if "当月是否预约" in c:
                col_map["当月是否预约"] = c
            if "当月是否出席" in c:
                col_map["当月是否出席"] = c
            if "首次1v1大单付费金额(usd)" in c:
                col_map["首次1v1大单付费金额"] = c

        # 反转 col_map 用于 DataFrame 列重命名（原始列名 → 标准键名）
        rename_map = {v_col: std_key for std_key, v_col in col_map.items() if v_col in df.columns}
        df_renamed = df.rename(columns=rename_map)

        # 向量化构建 records（各列直接操作）
        str_cols = [
            "学员ID", "渠道类型", "当月是否预约", "是否预约过", "是否转介绍", "当月是否出席",
            "转介绍类型", "推荐人学员ID",
            "首次分配CC员工姓名", "首次分配CC员工ID", "首次分配CC组名称",
            "末次分配CC员工姓名", "末次分配CC员工ID", "末次分配CC组名称",
        ]
        date_cols = [
            "注册日期(day)", "首次体验课约课日期(day)",
            "首次体验课出席日期(day)", "首次1v1大单付费日期(day)",
        ]

        def _safe_str(series: "pd.Series") -> "pd.Series":
            return series.where(series.notna(), other=None).apply(
                lambda v: str(v).strip() if v is not None else None
            )

        for col in str_cols:
            if col in df_renamed.columns:
                df_renamed[col] = _safe_str(df_renamed[col])
            else:
                df_renamed[col] = None

        for col in date_cols:
            if col in df_renamed.columns:
                df_renamed[col] = df_renamed[col].apply(
                    lambda v: self._clean_date(v) if pd.notna(v) else None
                )
            else:
                df_renamed[col] = None

        # 规范化渠道类型别名
        df_renamed["渠道类型"] = df_renamed["渠道类型"].apply(
            lambda v: self._normalize_alias(v) if v else None
        )

        # 数值列
        if "首次1v1大单付费金额" in df_renamed.columns:
            df_renamed["首次1v1大单付费金额"] = self._clean_numeric_vec(df_renamed["首次1v1大单付费金额"])
        else:
            df_renamed["首次1v1大单付费金额"] = None
        if "CC总流转次数" in df_renamed.columns:
            df_renamed["CC总流转次数"] = self._clean_numeric_vec(df_renamed["CC总流转次数"])
        else:
            df_renamed["CC总流转次数"] = None

        # 向量化计算注册→付费天数 days_to_payment（用于 A3 时间间隔分布）
        reg_date_series = df_renamed["注册日期(day)"]
        paid_date_series_raw = df_renamed["首次1v1大单付费日期(day)"]

        def _parse_date_str(v: object) -> "Optional[_dt]":
            if not v or not isinstance(v, str):
                return None
            for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
                try:
                    return _dt.strptime(v[:10], fmt)
                except ValueError:
                    continue
            return None

        reg_dates = reg_date_series.apply(_parse_date_str)
        paid_dates = paid_date_series_raw.apply(_parse_date_str)

        def _calc_days(pair: tuple) -> "Optional[int]":
            reg, paid = pair
            if reg is None or paid is None:
                return None
            try:
                return int((paid - reg).days)
            except Exception:
                return None

        df_renamed["days_to_payment"] = list(
            map(_calc_days, zip(reg_dates, paid_dates))
        )

        records = df_renamed[str_cols + date_cols + ["首次1v1大单付费金额", "CC总流转次数", "days_to_payment"]].to_dict("records")

        # 向量化聚合 by_cc / by_team（groupby 替代逐行累加）
        # 判断付费是否在当月
        paid_date_series = df_renamed["首次1v1大单付费日期(day)"]
        paid_this_month_mask = paid_date_series.apply(
            lambda v: bool(v and isinstance(v, str) and v.startswith(_report_month_prefix))
        )
        df_renamed["_paid_this_month"] = paid_this_month_mask.astype(int)

        # 布尔指标向量化
        bool_true_vals = {"1", "1.0", 1, True}
        df_renamed["_预约_flag"] = df_renamed["当月是否预约"].isin(bool_true_vals).astype(int)
        df_renamed["_出席_flag"] = df_renamed["当月是否出席"].isin(bool_true_vals).astype(int)

        # by_cc groupby
        cc_col_val = df_renamed["末次分配CC员工姓名"].fillna("").replace("nan", "")
        df_renamed["_cc_key"] = cc_col_val
        cc_valid = df_renamed[df_renamed["_cc_key"] != ""].copy()

        by_cc: dict = {}
        if not cc_valid.empty:
            # 保留每个 CC 的团队（取第一个）
            cc_team = cc_valid.groupby("_cc_key")["末次分配CC组名称"].first()
            cc_agg = cc_valid.groupby("_cc_key")[["_预约_flag", "_出席_flag", "_paid_this_month"]].sum()
            cc_counts = cc_valid.groupby("_cc_key").size().rename("leads")
            cc_df = pd.concat([cc_counts, cc_agg, cc_team], axis=1)
            for cc_name, row in cc_df.iterrows():
                by_cc[cc_name] = {
                    "CC": cc_name,
                    "团队": row.get("末次分配CC组名称"),
                    "leads": int(row["leads"]),
                    "预约": int(row["_预约_flag"]),
                    "出席": int(row["_出席_flag"]),
                    "付费": int(row["_paid_this_month"]),
                }

        # by_team groupby
        team_col_val = df_renamed["末次分配CC组名称"].fillna("").replace("nan", "")
        df_renamed["_team_key"] = team_col_val
        team_valid = df_renamed[df_renamed["_team_key"] != ""].copy()

        by_team: dict = {}
        if not team_valid.empty:
            team_agg = team_valid.groupby("_team_key")[["_预约_flag", "_出席_flag", "_paid_this_month"]].sum()
            team_counts = team_valid.groupby("_team_key").size().rename("leads")
            team_df = pd.concat([team_counts, team_agg], axis=1)
            for team_name, row in team_df.iterrows():
                by_team[team_name] = {
                    "团队": team_name,
                    "leads": int(row["leads"]),
                    "预约": int(row["_预约_flag"]),
                    "出席": int(row["_出席_flag"]),
                    "付费": int(row["_paid_this_month"]),
                }

        return {
            "records": records,
            "by_cc": by_cc,
            "by_team": by_team,
            "total_leads": len(records),
        }

    # ── A4: 宽口径leads达成-个人 ────────────────────────────────────────
    def _load_a4_leads_personal(self) -> dict:
        """
        A4: BI-Leads_宽口径leads达成-个人_D-1
        Sheet: 转介绍leads达成_by个人
        63行×9列，合并单元格前3列
        """
        path = self._find_latest_file("BI-Leads_宽口径leads达成-个人_D-1")
        if not path:
            logger.warning("A4: 数据文件未找到")
            return {}

        df = self._read_xlsx_pandas(path, sheet_name="转介绍leads达成_by个人", header=0)
        if df.empty:
            return {}

        df.columns = [str(c).strip() for c in df.columns]

        # 前向填充合并单元格（海外大区、EA_CM团队、转介绍小组）
        merge_cols = df.columns[:3].tolist()
        df = self._ffill_merged(df, merge_cols)

        import pandas as pd

        # 向量化：按姓名列过滤无效行
        skip_vals = {"nan", "转介绍销售名称", "小计", "总计", "", "-", "—"}
        name_series = df.iloc[:, 3].apply(lambda v: str(v).strip() if pd.notna(v) else None)
        valid_mask = name_series.notna() & ~name_series.isin(skip_vals)
        df_valid = df[valid_mask].copy()

        if df_valid.empty:
            return {"records": []}

        # 向量化构建各字段
        def _safe_str_col(col_idx) -> Any:
            return df_valid.iloc[:, col_idx].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )

        regions = _safe_str_col(0)
        teams = df_valid.iloc[:, 1].apply(
            lambda v: self._normalize_team(self._normalize_alias(str(v).strip())) if pd.notna(v) else "THCC"
        )
        groups = _safe_str_col(2)
        names = name_series[valid_mask]
        leads = self._clean_numeric_vec(df_valid.iloc[:, 4]) if df_valid.shape[1] > 4 else pd.Series([None] * len(df_valid))
        reserve = self._clean_numeric_vec(df_valid.iloc[:, 5]) if df_valid.shape[1] > 5 else pd.Series([None] * len(df_valid))
        showup = self._clean_numeric_vec(df_valid.iloc[:, 6]) if df_valid.shape[1] > 6 else pd.Series([None] * len(df_valid))
        paid = self._clean_numeric_vec(df_valid.iloc[:, 7]) if df_valid.shape[1] > 7 else pd.Series([None] * len(df_valid))
        conv = self._clean_numeric_vec(df_valid.iloc[:, 8]) if df_valid.shape[1] > 8 else pd.Series([None] * len(df_valid))

        records = [
            {
                "name": names.iloc[i],
                "region": regions.iloc[i],
                "team": teams.iloc[i],
                "group": groups.iloc[i],
                "leads": leads.iloc[i],
                "reserve": reserve.iloc[i],
                "showup": showup.iloc[i],
                "paid": paid.iloc[i],
                "conversion_rate": conv.iloc[i],
            }
            for i in range(len(df_valid))
        ]

        return {"records": records}

    # ── A5: 宣萱_转介绍不同口径对比（历史月度趋势） ────────────────────────────
    def _load_a5_overview_trend(self) -> dict:
        """
        A5: 宣萱_转介绍不同口径对比_D-1
        Sheet: 转介绍不同口径对比
        必须使用 calamine 引擎（openpyxl 因字体 metadata bug 会失败）

        结构（38列，约52行）：
          Row 0-2: 注释行（跳过）
          Row 3:   组表头 → 转介绍口径(×2) | 总计(×9) | CC窄口径(×9) | SS窄口径(×9) | 其它(×9)
          Row 4:   子表头 → 注册|预约|出席|付费|美金金额|注册付费率|预约率|预约出席率|出席付费率
          Row 5+:  数据行，按月分组（Col0=月份 YYYYMM，Col1=CC组/小计）

        输出：
          monthly_trend: list[{month, total, cc_narrow, ss_narrow, other}]
          每个口径字段: {register, appointment, showup, paid, revenue_usd,
                        leads_to_pay_rate, appointment_rate, appt_showup_rate, showup_pay_rate}
        """
        import pandas as pd

        path = self._find_latest_file("宣萱_转介绍不同口径对比_D-1")
        if not path:
            logger.warning("A5: 数据文件未找到")
            return {}

        # 必须使用 calamine 引擎
        logger.info(f"A5: 使用 calamine 引擎读取 {path.name}")
        try:
            df_raw = pd.read_excel(
                path,
                sheet_name="转介绍不同口径对比",
                header=None,
                engine="calamine",
            )
        except Exception as e:
            logger.error(f"A5: calamine 读取失败: {e}")
            return {}

        if df_raw.empty or len(df_raw) < 5:
            logger.warning("A5: 数据行不足")
            return {}

        # Row 3 (index 3): 组表头（转介绍口径×2 | 总计×9 | CC窄口径×9 | SS窄口径×9 | 其它×9）
        # Row 4 (index 4): 子表头（注册|预约|出席|付费|美金金额|注册付费率|预约率|预约出席率|出席付费率）
        # 数据行从 Row 5 (index 5) 开始
        group_header = df_raw.iloc[3].ffill().tolist()
        sub_header = df_raw.iloc[4].tolist()

        # 构建扁平列名（维度列保持原样，数值列拼接 "组别_子指标"）
        col_names: list[str] = []
        for i, (g, s) in enumerate(zip(group_header, sub_header)):
            g_str = str(g).strip() if str(g).strip() not in ("nan", "") else ""
            s_str = str(s).strip() if str(s).strip() not in ("nan", "") else ""
            if i < 2:
                # 前两列是维度列：月份 + CC组
                col_names.append(f"dim_{i}")
            elif s_str:
                col_names.append(f"{g_str}_{s_str}")
            else:
                col_names.append(f"col_{i}")

        df = df_raw.iloc[5:].copy()
        df.columns = col_names[: len(df.columns)]
        df = df.reset_index(drop=True)

        # 前向填充月份列（合并单元格）
        df["dim_0"] = df["dim_0"].ffill()

        # 子指标名称 → 英文 key 映射
        _metric_map = {
            "注册": "register",
            "预约": "appointment",
            "出席": "showup",
            "付费": "paid",
            "美金金额": "revenue_usd",
            "注册付费率": "leads_to_pay_rate",
            "预约率": "appointment_rate",
            "预约出席率": "appt_showup_rate",
            "出席付费率": "showup_pay_rate",
        }

        # 口径组名称 → 输出 key 映射
        _group_map = {
            "总计": "total",
            "CC窄口径": "cc_narrow",
            "SS窄口径": "ss_narrow",
            "其它": "other",
        }

        def _extract_scope(row: "pd.Series", group_cn: str) -> dict[str, Any]:
            """从行中提取指定口径的 9 个指标"""
            result: dict[str, Any] = {}
            for metric_cn, metric_en in _metric_map.items():
                col = f"{group_cn}_{metric_cn}"
                val = self._clean_numeric(row.get(col))
                result[metric_en] = val
            return result

        # 按月分组，分离"小计"行（月度汇总）和团队明细行
        monthly_trend: list[dict[str, Any]] = []
        team_details: list[dict[str, Any]] = []
        months_seen: set[str] = set()

        for _, row in df.iterrows():
            month_raw = str(row.get("dim_0", "")).strip()
            cc_group = str(row.get("dim_1", "")).strip() if "dim_1" in row.index else ""

            # 月份格式：6位纯数字 YYYYMM
            if not month_raw.isdigit() or len(month_raw) != 6:
                # 尝试从 float（如 202509.0）中提取
                try:
                    month_int = int(float(month_raw))
                    month_raw = str(month_int)
                except (ValueError, TypeError):
                    continue

            if len(month_raw) != 6 or not month_raw.isdigit():
                continue

            is_summary = cc_group in ("小计", "总计", "", "nan", "None")

            if is_summary:
                # 月度汇总行 → monthly_trend（每月只取第一条）
                if month_raw not in months_seen:
                    months_seen.add(month_raw)
                    entry: dict[str, Any] = {"month": month_raw}
                    for group_cn, group_en in _group_map.items():
                        entry[group_en] = _extract_scope(row, group_cn)
                    monthly_trend.append(entry)
            else:
                # 团队明细行 → team_details
                detail: dict[str, Any] = {"month": month_raw, "team": cc_group}
                for group_cn, group_en in _group_map.items():
                    detail[group_en] = _extract_scope(row, group_cn)
                team_details.append(detail)

        # 按月份升序排列
        monthly_trend.sort(key=lambda x: x["month"])
        team_details.sort(key=lambda x: (x["month"], x["team"]))

        current_month = monthly_trend[-1]["month"] if monthly_trend else ""

        return {
            "monthly_trend": monthly_trend,
            "team_details": team_details,
            "current_month": current_month,
        }
