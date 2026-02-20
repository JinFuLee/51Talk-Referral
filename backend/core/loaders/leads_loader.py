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

        by_team = []
        for _, row in df.iterrows():
            # 跳过全空行
            if all(str(v).strip() in ("nan", "", "None") for v in row.values):
                continue

            region = str(row.iloc[0]).strip() if str(row.iloc[0]).strip() not in ("nan", "") else None
            team = str(row.iloc[1]).strip() if str(row.iloc[1]).strip() not in ("nan", "") else None
            group = str(row.iloc[2]).strip() if str(row.iloc[2]).strip() not in ("nan", "") else None

            if not team and not group:
                continue

            # 列值按位置读取 (3~27 共25列，5通道×5指标)
            vals = [self._clean_numeric(row.iloc[i]) if i < len(row) else None for i in range(3, min(28, len(row)))]

            def _chan(ch_offset):
                # 布局: 指标优先（5指标×5通道）
                # 指标顺序: 注册付费率(0), 注册(1), 预约(2), 出席(3), 付费(4)
                # ch_offset: 0=总计, 1=CC, 2=EA(SS), 3=CM(LP), 4=宽
                return {
                    "注册付费率": vals[0 * 5 + ch_offset] if 0 * 5 + ch_offset < len(vals) else None,
                    "注册":       vals[1 * 5 + ch_offset] if 1 * 5 + ch_offset < len(vals) else None,
                    "预约":       vals[2 * 5 + ch_offset] if 2 * 5 + ch_offset < len(vals) else None,
                    "出席":       vals[3 * 5 + ch_offset] if 3 * 5 + ch_offset < len(vals) else None,
                    "付费":       vals[4 * 5 + ch_offset] if 4 * 5 + ch_offset < len(vals) else None,
                }

            record = {
                "海外大区": region,
                "团队": self._normalize_alias(team) if team else None,
                "小组": group,
                "总计": _chan(0),
                "CC窄口径": _chan(1),
                "SS窄口径": _chan(2),  # EA→SS
                "LP窄口径": _chan(3),  # CM→LP
                "宽口径": _chan(4),
            }
            by_team.append(record)

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

        by_enclosure = []
        for _, row in df.iterrows():
            if all(str(v).strip() in ("nan", "", "None") for v in row.values):
                continue

            region = str(row.iloc[0]).strip() if str(row.iloc[0]).strip() not in ("nan", "") else None
            enclosure = str(row.iloc[1]).strip() if str(row.iloc[1]).strip() not in ("nan", "") else None

            if not enclosure:
                continue

            vals = [self._clean_numeric(row.iloc[i]) if i < len(row) else None for i in range(2, min(32, len(row)))]

            def _chan(offset):
                # 每通道6列: 带货比, 参与率, 围场转率, A学员数, 推荐注册, 推荐付费
                base = offset * 6
                return {
                    "带货比": vals[base] if base < len(vals) else None,
                    "参与率": vals[base + 1] if base + 1 < len(vals) else None,
                    "围场转率": vals[base + 2] if base + 2 < len(vals) else None,
                    "A学员数": vals[base + 3] if base + 3 < len(vals) else None,
                    "推荐注册": vals[base + 4] if base + 4 < len(vals) else None,
                    "推荐付费": vals[base + 5] if base + 5 < len(vals) else None,
                }

            record = {
                "海外大区": region,
                "围场": enclosure,
                "总计": _chan(0),
                "CC窄口径": _chan(1),
                "LP窄口径": _chan(2),   # CM→LP
                "SS窄口径": _chan(3),   # EA→SS
                "宽口径": _chan(4),
            }
            by_enclosure.append(record)

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

        path = self._find_latest_file("BI-Leads_全口径leads明细表_D-1")
        if not path:
            logger.warning("A3: 数据文件未找到")
            return {}

        df = self._read_xlsx_pandas(path, sheet_name="CM_EA转介绍leads明细表", header=0)
        if df.empty:
            return {}

        # 列名清洗
        df.columns = [str(c).strip() for c in df.columns]

        records = []
        by_cc: dict = {}
        by_team: dict = {}

        # 实际列名映射（处理列名变体）
        col_map = {c: c for c in df.columns}
        # 末次CC列可能有"（当前）"前缀
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

        for _, row in df.iterrows():
            rec: dict = {}

            def _get(col_key: str):
                actual = col_map.get(col_key, col_key)
                return row.get(actual, None)

            # 学员基础信息
            raw_id = _get("学员ID")
            rec["学员ID"] = str(raw_id).strip() if pd.notna(raw_id) else None
            raw_ch = _get("渠道类型")
            rec["渠道类型"] = self._normalize_alias(str(raw_ch).strip()) if pd.notna(raw_ch) else None

            # 日期字段
            for date_col in [
                "注册日期(day)", "首次体验课约课日期(day)", "首次体验课出席日期(day)", "首次1v1大单付费日期(day)"
            ]:
                raw = _get(date_col)
                rec[date_col] = self._clean_date(raw) if pd.notna(raw) else None

            # 布尔/标记字段
            for bool_col in ["当月是否预约", "是否预约过", "是否转介绍", "当月是否出席"]:
                raw = _get(bool_col)
                rec[bool_col] = str(raw).strip() if pd.notna(raw) else None

            raw_type = _get("转介绍类型")
            rec["转介绍类型"] = str(raw_type).strip() if pd.notna(raw_type) else None
            raw_ref = _get("推荐人学员ID")
            rec["推荐人学员ID"] = str(raw_ref).strip() if pd.notna(raw_ref) else None

            # 金额（优先 USD 列）
            rec["首次1v1大单付费金额"] = self._clean_numeric(_get("首次1v1大单付费金额"))

            # CC 相关字段
            for cc_col in [
                "首次分配CC员工姓名", "首次分配CC员工ID", "首次分配CC组名称",
                "末次分配CC员工姓名", "末次分配CC员工ID", "末次分配CC组名称",
            ]:
                raw = _get(cc_col)
                rec[cc_col] = str(raw).strip() if pd.notna(raw) else None

            rec["CC总流转次数"] = self._clean_numeric(_get("CC总流转次数"))

            records.append(rec)

            # by_cc 聚合（用末次分配CC）
            cc_name = rec.get("末次分配CC员工姓名") or ""
            if cc_name and cc_name not in ("nan", ""):
                if cc_name not in by_cc:
                    by_cc[cc_name] = {
                        "CC": cc_name,
                        "团队": rec.get("末次分配CC组名称"),
                        "leads": 0, "预约": 0, "出席": 0, "付费": 0,
                    }
                by_cc[cc_name]["leads"] += 1
                if rec.get("当月是否预约") in ("1", "1.0", 1, True):
                    by_cc[cc_name]["预约"] += 1
                if rec.get("当月是否出席") in ("1", "1.0", 1, True):
                    by_cc[cc_name]["出席"] += 1
                if rec.get("首次1v1大单付费日期(day)"):
                    by_cc[cc_name]["付费"] += 1

            # by_team 聚合
            team = rec.get("末次分配CC组名称") or ""
            if team and team not in ("nan", ""):
                if team not in by_team:
                    by_team[team] = {
                        "团队": team, "leads": 0, "预约": 0, "出席": 0, "付费": 0,
                    }
                by_team[team]["leads"] += 1

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

        records = []
        for _, row in df.iterrows():
            import pandas as pd

            name_raw = row.iloc[3] if len(row) > 3 else None
            name = str(name_raw).strip() if pd.notna(name_raw) else None
            if not name or name in ("nan", "转介绍销售名称", "小计", "总计", ""):
                continue

            records.append({
                "name": name,
                "region": str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else None,
                "team": self._normalize_alias(str(row.iloc[1]).strip()) if pd.notna(row.iloc[1]) else None,
                "group": str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else None,
                "leads": self._clean_numeric(row.iloc[4] if len(row) > 4 else None),
                "reserve": self._clean_numeric(row.iloc[5] if len(row) > 5 else None),
                "showup": self._clean_numeric(row.iloc[6] if len(row) > 6 else None),
                "paid": self._clean_numeric(row.iloc[7] if len(row) > 7 else None),
                "conversion_rate": self._clean_numeric(row.iloc[8] if len(row) > 8 else None),
            })

        return {"records": records}
