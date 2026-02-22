"""
A 类 Leads 数据加载器 — 4 个数据源
A1: BI-Leads_宽口径leads达成_D-1
A2: BI-Leads_全口径转介绍类型-当月效率_D-1
A3: BI-Leads_全口径leads明细表_D-1
A4: BI-Leads_宽口径leads达成-个人_D-1
"""
from pathlib import Path
from typing import Optional
import logging

from .base import BaseLoader

logger = logging.getLogger(__name__)


class LeadsLoader(BaseLoader):
    """A 类 Leads 数据加载器"""

    def __init__(self, input_dir: Path):
        super().__init__(input_dir)

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

        def _is_all_empty(row):
            return all(str(v).strip() in ("nan", "", "None") for v in row.values)

        non_empty_mask = ~df.apply(_is_all_empty, axis=1)
        df_valid = df[non_empty_mask].copy()

        # 过滤 team 和 group 都为空的行
        def _team_group_empty(row):
            team = self._normalize_team(str(row.iloc[1]).strip())
            group = str(row.iloc[2]).strip() if str(row.iloc[2]).strip() not in ("nan", "") else None
            return not team and not group

        valid_mask = ~df_valid.apply(_team_group_empty, axis=1)
        df_valid = df_valid[valid_mask].copy()

        # 预先向量化清洗数值列 (3~27)
        num_cols = df_valid.columns[3:min(28, len(df_valid.columns))]
        df_nums = df_valid[num_cols].applymap(self._clean_numeric)

        def _build_record(idx_pos):
            row = df_valid.iloc[idx_pos]
            nums = df_nums.iloc[idx_pos].tolist()
            # 补齐到 25 个元素
            while len(nums) < 25:
                nums.append(None)

            def _chan(ch_offset):
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

        non_empty_mask = ~df.apply(
            lambda row: all(str(v).strip() in ("nan", "", "None") for v in row.values), axis=1
        )
        enc_col = df.iloc[:, 1].apply(lambda v: str(v).strip() if str(v).strip() not in ("nan", "") else None)
        valid_mask = non_empty_mask & enc_col.notna()
        df_valid = df[valid_mask].copy()

        # 预先清洗数值列 (2~31)
        num_cols = df_valid.columns[2:min(32, len(df_valid.columns))]
        df_nums = df_valid[num_cols].applymap(self._clean_numeric)

        def _build_enc_record(idx_pos):
            row = df_valid.iloc[idx_pos]
            nums = df_nums.iloc[idx_pos].tolist()
            while len(nums) < 30:
                nums.append(None)

            def _chan(offset):
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
            enclosure = str(row.iloc[1]).strip()
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
            df_renamed["首次1v1大单付费金额"] = df_renamed["首次1v1大单付费金额"].apply(self._clean_numeric)
        else:
            df_renamed["首次1v1大单付费金额"] = None
        if "CC总流转次数" in df_renamed.columns:
            df_renamed["CC总流转次数"] = df_renamed["CC总流转次数"].apply(self._clean_numeric)
        else:
            df_renamed["CC总流转次数"] = None

        records = df_renamed[str_cols + date_cols + ["首次1v1大单付费金额", "CC总流转次数"]].to_dict("records")

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
        skip_vals = {"nan", "转介绍销售名称", "小计", "总计", ""}
        name_series = df.iloc[:, 3].apply(lambda v: str(v).strip() if pd.notna(v) else None)
        valid_mask = name_series.notna() & ~name_series.isin(skip_vals)
        df_valid = df[valid_mask].copy()

        if df_valid.empty:
            return {"records": []}

        # 向量化构建各字段
        def _safe_str_col(col_idx):
            return df_valid.iloc[:, col_idx].apply(
                lambda v: str(v).strip() if pd.notna(v) else None
            )

        regions = _safe_str_col(0)
        teams = df_valid.iloc[:, 1].apply(
            lambda v: self._normalize_team(self._normalize_alias(str(v).strip())) if pd.notna(v) else "THCC"
        )
        groups = _safe_str_col(2)
        names = name_series[valid_mask]
        leads = df_valid.iloc[:, 4].apply(self._clean_numeric) if df_valid.shape[1] > 4 else pd.Series([None] * len(df_valid))
        reserve = df_valid.iloc[:, 5].apply(self._clean_numeric) if df_valid.shape[1] > 5 else pd.Series([None] * len(df_valid))
        showup = df_valid.iloc[:, 6].apply(self._clean_numeric) if df_valid.shape[1] > 6 else pd.Series([None] * len(df_valid))
        paid = df_valid.iloc[:, 7].apply(self._clean_numeric) if df_valid.shape[1] > 7 else pd.Series([None] * len(df_valid))
        conv = df_valid.iloc[:, 8].apply(self._clean_numeric) if df_valid.shape[1] > 8 else pd.Series([None] * len(df_valid))

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
