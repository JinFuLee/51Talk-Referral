"""通知推送双阶段验证系统

两阶段门控：
  Stage 1 (pre_generate): 数据源层验收 — 区域/团队/新鲜度/指标范围
  Stage 2 (pre_send):     消息层验收 — payload 区域字段/团队名/指标范围

三级验收流程：
  ① 本地 pre_send_check.py 全量验收
  ② 用户过目确认
  ③ 测试群发 → 用户确认 → 正式群发

失败日志: output/validation-failures.jsonl
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_LOG_PATH = _PROJECT_ROOT / "output" / "validation-failures.jsonl"

# ── 指标合理范围（经验值，30 天复审） ────────────────────────────────────────
_METRIC_BOUNDS: dict[str, tuple[float, float]] = {
    "转介绍注册数": (0, 10_000),
    "预约数": (0, 10_000),
    "出席数": (0, 10_000),
    "转介绍付费数": (0, 5_000),
    "总带新付费金额USD": (0, 2_000_000),
    "客单价": (0, 10_000),
}

_RATE_FIELDS = {
    "注册预约率", "预约出席率", "出席付费率", "注册转化率",
    "转介绍参与率", "打卡率", "当月有效打卡率", "CC触达率",
}

_TEAM_COLUMNS = ("last_cc_group_name", "last_ss_group_name", "last_lp_group_name")


@dataclass
class ValidationResult:
    passed: bool
    stage: str  # "pre_generate" | "pre_send"
    violations: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


class NotificationValidator:
    """通知数据双阶段验证器"""

    # ── Stage 1: Pre-Generate Gate ───────────────────────────────────────────

    def validate_pre_generate(
        self, data: dict[str, pd.DataFrame]
    ) -> ValidationResult:
        """验收 DataManager 缓存的原始数据（制作前）。

        D1/D2b 含多区域行是正常的（过滤在 API 层做），
        这里验证的是：过滤后的泰国行是否存在、数据是否新鲜、指标是否合理。
        """
        from backend.core.data_manager import DataManager

        violations: list[str] = []
        warnings: list[str] = []
        metadata: dict = {}

        # D1 结果数据：先过滤泰国行再验收
        d1 = data.get("result")
        if d1 is not None and not d1.empty:
            d1_thai = DataManager.filter_thai_region(d1, fallback_to_all=False)
            if d1_thai.empty:
                violations.append("[D1-结果数据] 无泰国区域行")
            else:
                violations += self._check_data_freshness(d1_thai, "D1-结果数据")
                violations += self._check_business_metrics(
                    d1_thai.iloc[0].to_dict(), "D1-结果数据"
                )
            metadata["d1_regions"] = (
                d1["区域"].unique().tolist() if "区域" in d1.columns else []
            )

        # D2b 区域汇总：验证泰国行存在
        d2b = data.get("d2b_summary")
        if d2b is not None and not d2b.empty:
            d2b_thai = DataManager.filter_thai_region(d2b, fallback_to_all=False)
            if d2b_thai.empty:
                violations.append("[D2b-区域汇总] 无泰国区域行")

        # D2/D3/D4 团队前缀（已经过 _filter_thai_only 过滤）
        # null 团队行是正常保留的（公共数据），降级为 warning
        for key, label in [
            ("enclosure_cc", "D2-围场CC"),
            ("detail", "D3-明细"),
            ("enclosure_ss", "D2-围场SS"),
            ("enclosure_lp", "D2-围场LP"),
        ]:
            df = data.get(key)
            if df is not None and not df.empty:
                team_issues = self._check_team_prefixes(df, label)
                # D3 明细含少量非泰国行是正常的（API 层 _filter_thai_only 已过滤）
                # Stage 1 仅作预警，Stage 2（API 输出）才是 hard deny
                for v in team_issues:
                    if "nan" in v.lower():
                        warnings.append(
                            v.replace("含非 TH- 前缀", "含空团队名")
                        )
                    else:
                        warnings.append(v + "（API 层已过滤，仅预警）")
                w = self._count_null_team_rows(df, label)
                if w:
                    warnings.append(w)

        return ValidationResult(
            passed=len(violations) == 0,
            stage="pre_generate",
            violations=violations,
            warnings=warnings,
            metadata=metadata,
        )

    # ── Stage 2: Pre-Send Gate ───────────────────────────────────────────────

    def validate_pre_send(
        self,
        payload_type: str,
        payload: dict,
    ) -> ValidationResult:
        """验收 API 返回的 payload（发送前）。"""
        violations: list[str] = []
        warnings: list[str] = []

        if payload_type == "overview":
            violations += self._check_payload_region(payload)
            metrics = payload.get("metrics", payload)
            violations += self._check_business_metrics(metrics, "overview")

        elif payload_type == "followup":
            students = payload.get("students", [])
            violations += self._check_students_teams(students)

        elif payload_type == "report":
            violations += self._check_payload_region(payload)
            violations += self._check_business_metrics(payload, "report")
            data_date = payload.get("date")
            if data_date:
                violations += self._check_date_value(data_date, "report")

        elif payload_type == "ranking":
            items = payload if isinstance(payload, list) else payload.get("items", [])
            for item in items:
                team = item.get("team") or item.get("cc_group") or ""
                if team and not str(team).strip().upper().startswith("TH"):
                    violations.append(
                        f"排名数据含非 TH- 团队: {team}"
                    )

        return ValidationResult(
            passed=len(violations) == 0,
            stage="pre_send",
            violations=violations,
            warnings=warnings,
            metadata={"payload_type": payload_type},
        )

    # ── 子检查方法 ───────────────────────────────────────────────────────────

    def _check_region_column(self, df: pd.DataFrame, label: str) -> list[str]:
        """检查区域列是否全部为泰国。"""
        if "区域" not in df.columns:
            return []
        regions = df["区域"].dropna().unique()
        non_thai = [r for r in regions if str(r) != "泰国"]
        if non_thai:
            return [f"[{label}] 含非泰国区域: {non_thai}"]
        return []

    def _check_team_prefixes(self, df: pd.DataFrame, label: str) -> list[str]:
        """检查团队列是否全部以 TH- 开头。"""
        violations = []
        for col in _TEAM_COLUMNS:
            if col not in df.columns:
                continue
            values = df[col].dropna().astype(str).str.strip()
            values = values[values != ""]
            non_th = values[~values.str.upper().str.startswith("TH")]
            if not non_th.empty:
                samples = non_th.unique()[:5].tolist()
                violations.append(
                    f"[{label}] 列 {col} 含非 TH- 前缀: {samples}"
                )
        return violations

    def _count_null_team_rows(self, df: pd.DataFrame, label: str) -> str | None:
        """统计全部团队列均为 null 的行数。"""
        team_cols = [c for c in _TEAM_COLUMNS if c in df.columns]
        if not team_cols:
            return None
        all_null = df[team_cols].isna().all(axis=1)
        count = int(all_null.sum())
        if count > 0:
            return f"[{label}] {count} 行团队列全为 null（已保留，可能是公共数据）"
        return None

    def _check_data_freshness(self, df: pd.DataFrame, label: str) -> list[str]:
        """检查统计日期是否为 T-1。"""
        date_col = None
        for c in ("统计日期(day)", "统计日期"):
            if c in df.columns:
                date_col = c
                break
        if date_col is None:
            return []

        values = df[date_col].dropna().unique()
        today = date.today()
        yesterday = today - timedelta(days=1)

        violations = []
        for v in values:
            try:
                d = _parse_date(v)
            except (ValueError, TypeError):
                violations.append(f"[{label}] 无法解析统计日期: {v}")
                continue

            delta = (today - d).days
            if delta >= 2:
                violations.append(
                    f"[{label}] 数据过旧: 统计日期={d.isoformat()}, "
                    f"距今 {delta} 天（允许 T-1={yesterday.isoformat()}）"
                )
        return violations

    def _check_business_metrics(
        self, metrics: dict, label: str
    ) -> list[str]:
        """检查关键指标是否在合理范围内。"""
        violations = []
        for key, (lo, hi) in _METRIC_BOUNDS.items():
            val = metrics.get(key)
            if val is None:
                continue
            try:
                fv = float(val)
            except (ValueError, TypeError):
                continue
            if fv < lo or fv > hi:
                violations.append(
                    f"[{label}] {key}={fv} 超出范围 [{lo}, {hi}]"
                )

        for key in _RATE_FIELDS:
            val = metrics.get(key)
            if val is None:
                continue
            try:
                fv = float(val)
            except (ValueError, TypeError):
                continue
            if fv < 0.0 or fv > 1.0:
                violations.append(
                    f"[{label}] {key}={fv} 超出率值范围 [0, 1]"
                )

        return violations

    def _check_payload_region(self, payload: dict) -> list[str]:
        """检查 payload 中的区域字段。"""
        violations = []
        # overview payload: metrics.区域
        metrics = payload.get("metrics", payload)
        region = metrics.get("区域") or metrics.get("region")
        if region and str(region) != "泰国":
            violations.append(f"payload 区域字段={region}，非泰国")
        return violations

    def _check_students_teams(self, students: list[dict]) -> list[str]:
        """检查学员列表中的团队名。"""
        violations = []
        non_th_teams: set[str] = set()
        for s in students:
            for key in ("team", "group", *_TEAM_COLUMNS):
                val = s.get(key)
                if val and str(val).strip():
                    team = str(val).strip()
                    if not team.upper().startswith("TH"):
                        non_th_teams.add(team)

        if non_th_teams:
            samples = list(non_th_teams)[:5]
            violations.append(
                f"学员数据含 {len(non_th_teams)} 个非 TH- 团队: {samples}"
            )
        return violations

    def _check_date_value(
        self, data_date: str | int | float, label: str
    ) -> list[str]:
        """检查日期字段是否为 T-1。"""
        try:
            d = _parse_date(data_date)
        except (ValueError, TypeError):
            return [f"[{label}] 无法解析日期: {data_date}"]

        today = date.today()
        delta = (today - d).days
        if delta >= 2:
            return [
                f"[{label}] 数据过旧: date={d.isoformat()}, "
                f"距今 {delta} 天"
            ]
        return []

    # ── 工具方法 ─────────────────────────────────────────────────────────────

    @staticmethod
    def _df_to_metrics(df: pd.DataFrame) -> dict:
        """从 DataFrame 提取泰国行的 metrics dict。"""
        if "区域" in df.columns:
            thai = df[df["区域"] == "泰国"]
            if not thai.empty:
                return thai.iloc[0].to_dict()
        if not df.empty:
            return df.iloc[0].to_dict()
        return {}

    # ── 日志 ─────────────────────────────────────────────────────────────────

    def log_failure(self, result: ValidationResult, context: str) -> None:
        """将验证失败写入 output/validation-failures.jsonl。"""
        _LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        entry = {
            "ts": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "context": context,
            "stage": result.stage,
            "passed": result.passed,
            "violations": result.violations,
            "warnings": result.warnings,
            "metadata": result.metadata,
        }
        try:
            with open(_LOG_PATH, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except Exception as e:
            logger.warning("验证日志写入失败: %s", e)


# ── 辅助函数 ─────────────────────────────────────────────────────────────────

def _parse_date(val) -> date:
    """解析多种日期格式为 date 对象。"""
    if isinstance(val, date):
        return val
    if isinstance(val, datetime):
        return val.date()
    s = str(val).strip().replace(".0", "")
    if len(s) == 8 and s.isdigit():
        return datetime.strptime(s, "%Y%m%d").date()
    if "-" in s:
        return datetime.strptime(s[:10], "%Y-%m-%d").date()
    raise ValueError(f"无法解析日期: {val}")
