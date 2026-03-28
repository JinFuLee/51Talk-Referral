"""数据管线诊断系统 — 5 层全维度检查

路由：GET /api/data-health/data-quality

层 1：Excel 文件时效性
层 2：Python 引擎加载状态
层 3：API 端点可达性 (GET + 参数)
层 4：字段递归 null 检测 + 根因归并
层 5：前端崩溃日志 (error-log.jsonl 24h)
"""

from __future__ import annotations

import json
import os
import time
from collections import Counter
from datetime import datetime, timedelta
from fnmatch import fnmatch
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Request

from backend.api.dependencies import get_data_manager
from backend.core.data_manager import DataManager

router = APIRouter(tags=["data-health"])

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_HISTORY_PATH = _PROJECT_ROOT / "output" / "data-health-history.jsonl"

# ── 端点检查清单 ────────────────────────────────────────────────────────────────
_ENDPOINTS_TO_CHECK: list[dict] = [
    # 基础
    {"path": "/api/health", "module": "健康检查", "params": {}},
    # 总览
    {"path": "/api/overview", "module": "总览", "params": {}},
    # 漏斗
    {"path": "/api/funnel", "module": "漏斗分析", "params": {}},
    # 围场
    {"path": "/api/enclosure", "module": "围场分析", "params": {}},
    {"path": "/api/enclosure/health", "module": "围场健康", "params": {}},
    # 打卡
    {"path": "/api/checkin/ranking", "module": "打卡管理", "params": {}},
    # 报告
    {"path": "/api/report/daily", "module": "运营报告", "params": {}},
    {"path": "/api/report/summary", "module": "运营摘要", "params": {}},
    # 渠道归因
    {"path": "/api/attribution", "module": "渠道归因", "params": {}},
    # 配置
    {"path": "/api/config/targets", "module": "配置", "params": {}},
    # 指标矩阵
    {"path": "/api/indicator-matrix/registry", "module": "指标矩阵", "params": {}},
    {"path": "/api/indicator-matrix/matrix", "module": "指标矩阵", "params": {}},
    # CC 个人业绩
    {"path": "/api/cc-performance", "module": "CC 个人业绩", "params": {}},
    # 内场激励
    {"path": "/api/incentive/recommend", "module": "内场激励", "params": {}},
    {
        "path": "/api/incentive/campaigns",
        "module": "内场激励",
        "params": {"month": "CURRENT"},
    },
    {
        "path": "/api/incentive/progress",
        "module": "内场激励",
        "params": {"month": "CURRENT"},
    },
    {"path": "/api/incentive/budget", "module": "内场激励", "params": {}},
    # 日监控
    {"path": "/api/daily-monitor", "module": "日监控", "params": {}},
    # CC 矩阵
    {"path": "/api/cc-matrix", "module": "CC 矩阵", "params": {}},
    # 学员 360
    {"path": "/api/students/360", "module": "学员 360", "params": {}},
    # 续费风险
    {"path": "/api/renewal-risk", "module": "续费风险", "params": {}},
]

# ── 根因映射 ────────────────────────────────────────────────────────────────────
_ROOT_CAUSE_PATTERNS: list[tuple[str, str]] = [
    # ── D4 学员数据（出席/通话/触达/带新系数等学员级指标）──
    ("*.showup.*", "D4 学员数据"),
    ("*.calls_total", "D4 学员数据"),
    ("*.effective.*", "D4 学员数据"),
    ("*.connected.*", "D4 学员数据"),
    ("*.call_achievement_pct", "D4 学员数据"),
    ("*.call_proportion", "D4 学员数据"),
    ("*.called_this_month", "D4 学员数据"),
    ("*.coefficient", "D4 学员数据"),
    # ── CC 个人目标上传（revenue/ASP 直接依赖上传目标）──
    ("*.revenue.target", "CC 个人目标上传"),
    ("*.revenue.bm_expected", "CC 个人目标上传"),
    ("*.asp.*", "CC 个人目标上传"),
    ("*.team_revenue_target", "CC 个人目标上传"),
    # ── CC 个人目标推算（paid/leads/转化率依赖目标推导）──
    ("*.paid.*", "CC 个人目标上传（推算）"),
    ("*.leads.*", "CC 个人目标上传（推算）"),
    ("*.leads_to_paid.*", "CC 个人目标上传（推算）"),
    ("*.showup_to_paid.*", "CC 个人目标上传（推算）"),
    ("*.efficiency_lift_pct", "CC 个人目标上传（推算）"),
    # ── 月度目标未配置（appointment/register 目标需在 Settings 设置）──
    ("kpi_pace.appointment.*", "月度目标未配置"),
    ("kpi_pace.register.*", "月度目标未配置"),
    ("kpi_8item.appointment.*", "月度目标未配置"),
    ("stages*.achievement_rate", "月度目标未配置"),
    ("stages*.conversion_rate", "月度目标未配置"),
    ("stages*.target", "月度目标未配置"),
    ("stages*.gap", "月度目标未配置"),
    ("target_revenue", "月度目标未配置"),
    ("revenue_achievement", "月度目标未配置"),
    ("revenue_gap", "月度目标未配置"),
    # ── 历史快照不足（需积累 ≥7 天快照数据）──
    ("kpi_mom.*", "历史快照不足"),
    ("kpi_sparklines.*", "历史快照不足"),
    ("comparisons.*", "历史快照不足"),
    ("day_comparison.*", "历史快照不足"),
    # ── D2B 数据列名（部分指标需 D4 学员级数据计算）──
    ("d2b_summary.*", "D2B 数据"),
    # ── CC 过程指标（D2 围场聚合，无有效围场时为 null）──
    ("*.participation_rate", "CC 无有效围场"),
    ("*.checkin_rate", "CC 无有效围场"),
    ("*.cc_reach_rate", "CC 无有效围场"),
    ("*.leads_user_a", "D4 学员数据"),
    # ── D2 围场数据 ──
    ("*.enclosure*", "D2 围场数据"),
    ("*.finance_participation_rate", "D2 围场数据"),
    ("*.new_coefficient", "D2 围场数据"),
    # ── D1 汇总数据 ──
    ("*.register.*", "D1 汇总数据"),
    ("*.funnel.*", "D1 汇总数据"),
    # ── 激励活动配置 ──
    ("*.start_date", "激励活动配置"),
    ("*.end_date", "激励活动配置"),
    ("*.poster_path", "激励活动配置"),
    ("*.leverage_source", "激励活动配置"),
    # ── 打卡数据 ──
    ("by_role.*.by_enclosure", "打卡角色数据"),
    ("by_role.*.by_group", "打卡角色数据"),
    ("by_role.*.by_person", "打卡角色数据"),
    ("by_role.*.by_team", "打卡角色数据"),
    # ── 漏斗日期 ──
    ("date", "正常（非异常）"),
]

_REMEDIATION: dict[str, dict] = {
    "D4 学员数据": {"action": "下载 BI 数据", "manual": "双击 下载BI数据.command"},
    "D2 围场数据": {"action": "下载 BI 数据", "manual": "双击 下载BI数据.command"},
    "D1 汇总数据": {"action": "下载 BI 数据", "manual": "双击 下载BI数据.command"},
    "D2B 数据": {"action": "下载 BI 数据", "manual": "双击 下载BI数据.command"},
    "CC 个人目标上传": {"action": "上传个人目标", "link": "/cc-performance"},
    "CC 个人目标上传（推算）": {"action": "上传个人目标", "link": "/cc-performance"},
    "月度目标未配置": {"action": "设置月度目标", "link": "/settings"},
    "历史快照不足": {"action": "等待数据积累", "manual": "需 ≥7 天快照（自动积累）"},
    "激励活动配置": {"action": "配置激励活动", "link": "/settings"},
    "打卡角色数据": {"action": "下载 BI 数据", "manual": "运营角色无数据为正常"},
    "CC 无有效围场": {
        "action": "正常现象",
        "manual": "CC 名下无有效围场学员，过程指标为空",
    },
}


# ── 层 1：文件时效 ─────────────────────────────────────────────────────────────


def _check_file_freshness() -> list[dict]:
    """检查 DATA_SOURCE_DIR 下所有 xlsx 文件的修改时间"""
    data_source_dir = os.environ.get("DATA_SOURCE_DIR", "")
    src = Path(data_source_dir) if data_source_dir else _PROJECT_ROOT / "input"
    if not src.exists():
        return [{"source": "DATA_SOURCE_DIR", "status": "missing", "detail": str(src)}]

    results: list[dict] = []
    for f in sorted(src.glob("*.xlsx")):
        mtime = datetime.fromtimestamp(f.stat().st_mtime)
        age_days = (datetime.now() - mtime).days
        if age_days <= 1:
            status = "fresh"
        elif age_days <= 3:
            status = "stale"
        else:
            status = "expired"

        name = f.stem
        parts = name.split("_")
        # 提取关键标识：第二段（去掉前缀和日期）
        label = parts[1] if len(parts) > 1 else name
        # 再次简化：去掉末尾日期段（8 位数字）
        if label and len(label) > 8 and label[-8:].isdigit():
            label = label[:-9] if len(label) > 9 else label

        results.append(
            {
                "source": label or name,
                "file": f.name,
                "modified": mtime.isoformat(),
                "age_days": age_days,
                "status": status,
            }
        )

    if not results:
        results.append(
            {
                "source": "xlsx 文件",
                "file": "",
                "modified": "",
                "age_days": -1,
                "status": "missing",
            }
        )

    return results


# ── 层 2：引擎加载 ─────────────────────────────────────────────────────────────


def _check_engine_load(dm: DataManager) -> dict:
    """检查 DataManager 已加载数据集状态"""
    try:
        data = dm.load_all()
        tables: dict[str, Any] = {}
        total_rows = 0
        for key, df in data.items():
            if hasattr(df, "shape"):
                rows = int(df.shape[0])
                tables[key] = {"rows": rows, "cols": int(df.shape[1]), "status": "ok"}
                total_rows += rows
            elif df is None:
                tables[key] = {"status": "empty"}
            else:
                tables[key] = {"status": "unknown"}
        return {
            "status": "ok",
            "tables": tables,
            "total_rows": total_rows,
            "table_count": len(tables),
        }
    except Exception as e:
        return {"status": "error", "detail": str(e), "tables": {}, "total_rows": 0}


# ── 层 3+4：端点检查 + 字段递归 ───────────────────────────────────────────────


def _walk_fields(obj: Any, prefix: str = "", max_array_sample: int = 3) -> list[dict]:
    """递归遍历 JSON，输出每个叶节点的 path/type/value_preview/status"""
    fields: list[dict] = []

    if isinstance(obj, dict):
        for k, v in obj.items():
            child_prefix = f"{prefix}.{k}" if prefix else k
            fields.extend(_walk_fields(v, child_prefix, max_array_sample))

    elif isinstance(obj, list):
        count = len(obj)
        item_status = "ok" if count > 0 else "warn"
        fields.append(
            {
                "path": prefix,
                "type": "array",
                "value_preview": f"[{count} items]",
                "status": item_status,
            }
        )
        for i, item in enumerate(obj[:max_array_sample]):
            fields.extend(_walk_fields(item, f"{prefix}[{i}]", max_array_sample))
        if count > max_array_sample:
            fields.append(
                {
                    "path": f"{prefix}[{max_array_sample}..{count - 1}]",
                    "type": "sampled",
                    "value_preview": f"+{count - max_array_sample} more",
                    "status": "ok",
                }
            )

    elif obj is None:
        fields.append(
            {"path": prefix, "type": "null", "value_preview": "—", "status": "warn"}
        )

    elif isinstance(obj, bool):
        fields.append(
            {
                "path": prefix,
                "type": "boolean",
                "value_preview": str(obj),
                "status": "ok",
            }
        )

    elif isinstance(obj, (int, float)):
        fields.append(
            {
                "path": prefix,
                "type": "number",
                "value_preview": str(obj),
                "status": "ok",
            }
        )

    elif isinstance(obj, str):
        preview = (obj[:50] + "...") if len(obj) > 50 else obj
        fields.append(
            {
                "path": prefix,
                "type": "string",
                "value_preview": preview,
                "status": "ok",
            }
        )

    return fields


def _call_endpoints(
    base_url: str, current_month: str
) -> tuple[dict[str, dict], list[dict]]:
    """
    遍历 _ENDPOINTS_TO_CHECK，返回：
      endpoint_responses: path → parsed JSON（HTTP 200 时）
      module_results:     {module_name → list[ep_result]}
    """
    module_results: dict[str, list[dict]] = {}
    endpoint_responses: dict[str, Any] = {}

    with httpx.Client(timeout=20.0) as client:
        for ep in _ENDPOINTS_TO_CHECK:
            path = ep["path"]
            params = {
                k: (current_month if v == "CURRENT" else v)
                for k, v in ep.get("params", {}).items()
            }
            module_name = ep["module"]

            t1 = time.time()
            try:
                resp = client.get(f"{base_url}{path}", params=params)
                elapsed_ms = int((time.time() - t1) * 1000)

                if resp.status_code == 200:
                    try:
                        data = resp.json()
                    except Exception:
                        data = {}
                    endpoint_responses[path] = data
                    fields = _walk_fields(data)
                    null_fields = [f for f in fields if f["status"] == "warn"]
                    ep_result: dict = {
                        "path": path,
                        "status_code": 200,
                        "response_ms": elapsed_ms,
                        "total_fields": len(fields),
                        "null_fields": len(null_fields),
                        "null_field_paths": [nf["path"] for nf in null_fields],
                    }
                else:
                    ep_result = {
                        "path": path,
                        "status_code": resp.status_code,
                        "response_ms": elapsed_ms,
                        "total_fields": 0,
                        "null_fields": 0,
                        "null_field_paths": [],
                        "error": resp.text[:300],
                    }
            except Exception as exc:
                elapsed_ms = int((time.time() - t1) * 1000)
                ep_result = {
                    "path": path,
                    "status_code": 0,
                    "response_ms": elapsed_ms,
                    "total_fields": 0,
                    "null_fields": 0,
                    "null_field_paths": [],
                    "error": str(exc)[:300],
                }

            module_results.setdefault(module_name, []).append(ep_result)

    return endpoint_responses, module_results


# ── 根因归并 ───────────────────────────────────────────────────────────────────


def _match_pattern(path: str, pattern: str) -> bool:
    """简单通配匹配（支持 *）"""
    return fnmatch(path, pattern)


def _classify_null_path(path: str) -> str:
    """为单个 null 字段路径分类根因"""
    for pat, cause in _ROOT_CAUSE_PATTERNS:
        if _match_pattern(path, pat):
            return cause
    return "未知"


# 根因分类中标记为"正常"的类别，不计入异常统计
_NORMAL_CAUSES = {"正常（非异常）"}


def _merge_root_causes(null_paths: list[str]) -> list[dict]:
    """将 null 字段路径按根因归并，排除正常类别"""
    causes: dict[str, list[str]] = {}
    for path in null_paths:
        matched = _classify_null_path(path)
        causes.setdefault(matched, []).append(path)

    result: list[dict] = []
    for cause, paths in sorted(causes.items(), key=lambda x: -len(x[1])):
        if cause in _NORMAL_CAUSES:
            continue
        entry: dict = {
            "cause": cause,
            "affected_fields": len(paths),
            "sample_paths": paths[:3],
        }
        rem = _REMEDIATION.get(cause)
        if rem:
            entry["remediation"] = rem
        result.append(entry)
    return result


def _count_real_nulls(null_paths: list[str]) -> int:
    """统计排除正常类别后的真实 null 数"""
    return sum(1 for p in null_paths if _classify_null_path(p) not in _NORMAL_CAUSES)


# ── 跨端点一致性 ───────────────────────────────────────────────────────────────


def _check_cross_consistency(endpoint_responses: dict[str, Any]) -> list[dict]:
    """跨端点数据一致性检查（信息性对比）"""
    checks: list[dict] = []

    cc_perf = endpoint_responses.get("/api/cc-performance", {})

    if cc_perf and isinstance(cc_perf, dict):
        teams = cc_perf.get("teams", [])
        cc_count = sum(len(t.get("records", [])) for t in teams if isinstance(t, dict))
        checks.append(
            {
                "name": "CC 人数",
                "endpoints": ["/api/cc-performance", "/api/incentive/progress"],
                "values": {
                    "cc-performance": cc_count,
                    "incentive-progress": "N/A（取决于活动配置）",
                },
                "passed": True,
                "note": "incentive/progress 人数取决于活动配置，不要求一致",
            }
        )

    # 总览 vs 漏斗注册数
    overview = endpoint_responses.get("/api/overview", {})
    funnel = endpoint_responses.get("/api/funnel", {})
    if isinstance(overview, dict) and isinstance(funnel, dict):
        ov_reg = overview.get("total_register") or overview.get("register_count")
        fn_reg = funnel.get("register") or funnel.get("register_count")
        if ov_reg is not None and fn_reg is not None:
            passed = abs(float(ov_reg) - float(fn_reg)) < 5
            checks.append(
                {
                    "name": "注册数（总览 vs 漏斗）",
                    "endpoints": ["/api/overview", "/api/funnel"],
                    "values": {"overview": ov_reg, "funnel": fn_reg},
                    "passed": passed,
                    "note": ""
                    if passed
                    else f"差值 {abs(float(ov_reg) - float(fn_reg))}，请检查数据一致性",
                }
            )

    return checks


# ── 层 5：前端错误 ─────────────────────────────────────────────────────────────


def _check_frontend_errors() -> dict:
    """读 error-log.jsonl 最近 24h 的前端崩溃"""
    log_path = _PROJECT_ROOT / "output" / "error-log.jsonl"
    if not log_path.exists():
        return {"last_24h": 0, "top_errors": [], "note": "error-log.jsonl 不存在"}

    errors: list[dict] = []
    cutoff = (datetime.now() - timedelta(hours=24)).isoformat()
    try:
        for line in log_path.read_text(encoding="utf-8").strip().split("\n"):
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
                ts = entry.get("timestamp", "")
                if ts >= cutoff:
                    errors.append(entry)
            except json.JSONDecodeError:
                continue
    except Exception as exc:
        return {"last_24h": 0, "top_errors": [], "note": f"读取失败：{exc}"}

    counter: Counter = Counter(e.get("fingerprint", "unknown") for e in errors)
    top = []
    for fp, cnt in counter.most_common(5):
        sample = next((e for e in errors if e.get("fingerprint") == fp), {})
        top.append(
            {
                "fingerprint": fp,
                "count": cnt,
                "message": sample.get("message", ""),
                "page": sample.get("page", ""),
                "source_file": sample.get("source_file", ""),
            }
        )

    return {"last_24h": len(errors), "top_errors": top}


# ── 辅助函数 ───────────────────────────────────────────────────────────────────


def _fmt_api_status(total: int, module_results: dict) -> str:
    ok_count = sum(
        1 for eps in module_results.values() for ep in eps if ep["status_code"] == 200
    )
    return f"{total} 个端点，{ok_count} 个正常"


# ── 历史持久化 ─────────────────────────────────────────────────────────────────


def _load_last_check() -> dict | None:
    if not _HISTORY_PATH.exists():
        return None
    try:
        lines = [
            ln for ln in _HISTORY_PATH.read_text().strip().split("\n") if ln.strip()
        ]
        if lines:
            return json.loads(lines[-1])
    except Exception:
        pass
    return None


def _save_check_result(summary: dict) -> None:
    _HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(summary, ensure_ascii=False, default=str)
    with open(_HISTORY_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def _compute_diff(current_nulls: list[str], last: dict | None) -> dict:
    if not last:
        return {
            "last_checked_at": None,
            "new_issues": 0,
            "resolved_issues": 0,
            "trend": "first_run",
        }
    cur = set(current_nulls)
    prev = set(last.get("null_field_paths", []))
    new_cnt = len(cur - prev)
    resolved_cnt = len(prev - cur)
    if new_cnt < resolved_cnt:
        trend = "improving"
    elif new_cnt > resolved_cnt:
        trend = "degrading"
    else:
        trend = "stable"
    return {
        "last_checked_at": last.get("checked_at"),
        "new_issues": new_cnt,
        "resolved_issues": resolved_cnt,
        "trend": trend,
    }


# ── 主端点 ─────────────────────────────────────────────────────────────────────


@router.get("/data-quality", summary="数据管线全维度诊断（5 层）")
def check_data_quality(
    request: Request,
    dm: DataManager = Depends(get_data_manager),
) -> dict:
    """
    执行 5 层诊断：
    - 层 1：Excel 文件时效性
    - 层 2：Python 引擎加载状态
    - 层 3：API 端点可达性
    - 层 4：字段 null 检测 + 根因归并
    - 层 5：前端崩溃日志（24h）
    """
    from datetime import date

    t0 = time.time()
    current_month = date.today().strftime("%Y%m")

    # 层 1
    freshness = _check_file_freshness()

    # 层 2
    engine_status = _check_engine_load(dm)

    # 层 3 + 4
    base_url = "http://127.0.0.1:8100"
    endpoint_responses, module_results = _call_endpoints(base_url, current_month)

    # 汇总所有 null 路径
    all_null_paths: list[str] = []
    for eps in module_results.values():
        for ep in eps:
            all_null_paths.extend(ep.get("null_field_paths", []))

    # 根因归并
    root_causes = _merge_root_causes(all_null_paths)

    # 跨端点一致性
    cross_checks = _check_cross_consistency(endpoint_responses)

    # 层 5
    frontend_errors = _check_frontend_errors()

    # 历史对比
    last = _load_last_check()
    vs_last = _compute_diff(all_null_paths, last)

    # 汇总指标（排除正常类别的 null 字段）
    total_fields = sum(
        ep["total_fields"] for eps in module_results.values() for ep in eps
    )
    total_nulls = _count_real_nulls(all_null_paths)
    total_endpoints = sum(len(eps) for eps in module_results.values())
    health_pct = (
        round((total_fields - total_nulls) / total_fields * 100, 1)
        if total_fields > 0
        else 100.0
    )

    has_critical = any(
        ep["status_code"] not in (200,) for eps in module_results.values() for ep in eps
    )
    has_expired = any(f.get("status") == "expired" for f in freshness)
    has_missing = any(f.get("status") == "missing" for f in freshness)

    if has_critical or has_missing:
        overall = "critical"
    elif total_nulls > 0 or has_expired:
        overall = "warning"
    else:
        overall = "healthy"

    # 管线状态卡片
    file_layer_status = (
        "critical"
        if has_missing
        else "critical"
        if has_expired
        else "warning"
        if any(f.get("status") == "stale" for f in freshness)
        else "ok"
    )
    pipeline_status = [
        {
            "layer": "Excel 文件",
            "status": file_layer_status,
            "detail": f"{len(freshness)} 个文件",
        },
        {
            "layer": "Python 引擎",
            "status": engine_status["status"],
            "detail": (
                f"{engine_status.get('total_rows', 0):,} 行 / "
                f"{engine_status.get('table_count', 0)} 表"
                if engine_status["status"] == "ok"
                else engine_status.get("detail", "加载失败")
            ),
        },
        {
            "layer": "API 响应",
            "status": "critical" if has_critical else "ok",
            "detail": _fmt_api_status(total_endpoints, module_results),
        },
        {
            "layer": "前端渲染",
            "status": "warning" if frontend_errors["last_24h"] > 0 else "ok",
            "detail": f"{frontend_errors['last_24h']} 个崩溃（24h）",
        },
    ]

    # 模块汇总列表
    modules_summary = [
        {
            "name": name,
            "endpoints": eps,
            "total_fields": sum(e["total_fields"] for e in eps),
            "null_fields": sum(e["null_fields"] for e in eps),
            "all_ok": all(e["status_code"] == 200 for e in eps),
        }
        for name, eps in module_results.items()
    ]

    result = {
        "checked_at": datetime.now().isoformat(),
        "overall_status": overall,
        "overall_health_pct": health_pct,
        "total_endpoints": total_endpoints,
        "total_fields": total_fields,
        "null_fields": total_nulls,
        "check_duration_ms": int((time.time() - t0) * 1000),
        "vs_last_check": vs_last,
        "data_freshness": freshness,
        "engine_status": engine_status,
        "root_causes": root_causes,
        "cross_checks": cross_checks,
        "pipeline_status": pipeline_status,
        "frontend_errors": frontend_errors,
        "modules": modules_summary,
    }

    # 持久化历史（限制存储的 null 路径数量，防止文件膨胀）
    _save_check_result(
        {
            "checked_at": result["checked_at"],
            "overall_status": overall,
            "total_fields": total_fields,
            "null_fields": total_nulls,
            "null_field_paths": all_null_paths[:100],
        }
    )

    return result
