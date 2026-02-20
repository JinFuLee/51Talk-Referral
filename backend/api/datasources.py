"""
数据源管理 API 端点
状态查询、文件上传、注册表、刷新缓存
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

INPUT_DIR = PROJECT_ROOT / "input"

router = APIRouter()

_service: Any = None

# 35 数据源注册表（A/B/C/D/E/F 六类，与 MultiSourceLoader/AnalysisEngineV2 对应）
DATA_SOURCE_REGISTRY: list[dict[str, Any]] = [
    # ── A 类: Leads Pipeline ──────────────────────────────────────────────────
    {
        "id": "leads_achievement", "category": "leads",
        "dir": "BI-Leads_宽口径leads达成_D-1",
        "name_zh": "Leads达成(团队)", "freq": "D-1",
        "priority": "P0", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "leads_efficiency", "category": "leads",
        "dir": "BI-Leads_全口径转介绍类型-当月效率_D-1",
        "name_zh": "转介绍效率", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "leads_detail", "category": "leads",
        "dir": "BI-Leads_全口径leads明细表_D-1",
        "name_zh": "Leads明细", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": True,
    },
    {
        "id": "leads_individual", "category": "leads",
        "dir": "BI-Leads_宽口径leads达成-个人_D-1",
        "name_zh": "Leads达成(个人)", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    # ── B 类: ROI ─────────────────────────────────────────────────────────────
    {
        "id": "roi_model", "category": "roi",
        "dir": "中台_转介绍ROI测算数据模型_M-1",
        "name_zh": "ROI测算模型", "freq": "M-1",
        "priority": "P2", "update_frequency": "monthly", "is_single_point": False,
    },
    # ── C 类: Cohort ──────────────────────────────────────────────────────────
    {
        "id": "cohort_reach", "category": "cohort",
        "dir": "BI-cohort模型_CC触达率_M-1",
        "name_zh": "Cohort触达率", "freq": "M-1",
        "priority": "P1", "update_frequency": "monthly", "is_single_point": False,
    },
    {
        "id": "cohort_participation", "category": "cohort",
        "dir": "BI-cohort模型_CC参与率_M-1",
        "name_zh": "Cohort参与率", "freq": "M-1",
        "priority": "P1", "update_frequency": "monthly", "is_single_point": False,
    },
    {
        "id": "cohort_checkin", "category": "cohort",
        "dir": "BI-cohort模型_CC打卡率_M-1",
        "name_zh": "Cohort打卡率", "freq": "M-1",
        "priority": "P1", "update_frequency": "monthly", "is_single_point": False,
    },
    {
        "id": "cohort_coefficient", "category": "cohort",
        "dir": "BI-cohort模型_CC帶新系數_M-1",
        "name_zh": "Cohort带新系数", "freq": "M-1",
        "priority": "P1", "update_frequency": "monthly", "is_single_point": False,
    },
    {
        "id": "cohort_ratio", "category": "cohort",
        "dir": "BI-cohort模型_CC帶貨比_M-1",
        "name_zh": "Cohort带货比", "freq": "M-1",
        "priority": "P1", "update_frequency": "monthly", "is_single_point": False,
    },
    {
        "id": "cohort_detail", "category": "cohort",
        "dir": "BI-cohort模型_CCcohort明细表_M-1",
        "name_zh": "Cohort明细", "freq": "M-1",
        "priority": "P2", "update_frequency": "monthly", "is_single_point": False,
    },
    # ── D 类: KPI ─────────────────────────────────────────────────────────────
    {
        "id": "north_star_24h", "category": "kpi",
        "dir": "BI-北极星指标_当月24H打卡率_D-1",
        "name_zh": "24H打卡率(北极星)", "freq": "D-1",
        "priority": "P0", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "enclosure_market", "category": "kpi",
        "dir": "BI-KPI_市场-本月围场数据_D-1",
        "name_zh": "围场-市场", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "enclosure_referral", "category": "kpi",
        "dir": "BI-KPI_转介绍-本月围场数据_D-1",
        "name_zh": "围场-转介绍", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "enclosure_combined", "category": "kpi",
        "dir": "BI-KPI_市场&转介绍-本月围场数据_D-1",
        "name_zh": "围场-合计", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "checkin_monthly", "category": "kpi",
        "dir": "BI-KPI_当月转介绍打卡率_D-1",
        "name_zh": "月度转介绍打卡率", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    # ── E 类: Order ───────────────────────────────────────────────────────────
    {
        "id": "cc_attendance", "category": "order",
        "dir": "BI-订单_CC上班人数_D-1",
        "name_zh": "CC上班人数", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "ss_attendance", "category": "order",
        "dir": "BI-订单_SS上班人数_D-1",
        "name_zh": "SS上班人数", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "order_detail", "category": "order",
        "dir": "BI-订单_明细_D-1",
        "name_zh": "订单明细", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": True,
    },
    {
        "id": "order_trend", "category": "order",
        "dir": "BI-订单_套餐类型订单日趋势_D-1",
        "name_zh": "订单日趋势", "freq": "D-1",
        "priority": "P2", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "revenue_trend", "category": "order",
        "dir": "BI-订单_业绩日趋势_D-1",
        "name_zh": "业绩日趋势", "freq": "D-1",
        "priority": "P2", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "package_ratio", "category": "order",
        "dir": "BI-订单_套餐类型占比_D-1",
        "name_zh": "套餐类型占比", "freq": "D-1",
        "priority": "P2", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "team_package", "category": "order",
        "dir": "BI-订单_分小组套餐类型占比_D-1",
        "name_zh": "分组套餐占比", "freq": "D-1",
        "priority": "P2", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "channel_revenue", "category": "order",
        "dir": "BI-订单_套餐分渠道金额_D-1",
        "name_zh": "渠道金额", "freq": "D-1",
        "priority": "P2", "update_frequency": "daily", "is_single_point": False,
    },
    # ── F 类: Operations ──────────────────────────────────────────────────────
    {
        "id": "funnel_efficiency", "category": "ops",
        "dir": "宣宣_漏斗跟进效率_D-1",
        "name_zh": "漏斗跟进效率", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "section_efficiency", "category": "ops",
        "dir": "宣宣_截面跟进效率_D-1",
        "name_zh": "截面跟进效率", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "section_mom", "category": "ops",
        "dir": "宣宣_截面跟进效率-月度环比_D-1",
        "name_zh": "截面月度环比", "freq": "D-1",
        "priority": "P2", "update_frequency": "monthly", "is_single_point": False,
    },
    {
        "id": "channel_mom", "category": "ops",
        "dir": "宣宣_转介绍渠道-月度环比_D-1",
        "name_zh": "渠道月度环比", "freq": "D-1",
        "priority": "P2", "update_frequency": "monthly", "is_single_point": False,
    },
    {
        "id": "daily_outreach", "category": "ops",
        "dir": "宣宣_转介绍每日外呼数据_D-1",
        "name_zh": "每日外呼", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "trial_followup", "category": "ops",
        "dir": "宣宣_转介绍体验用户分配后跟进明细_D-1",
        "name_zh": "体验用户跟进", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "paid_followup", "category": "ops",
        "dir": "宣宣_付费用户围场当月跟进明细_D-1",
        "name_zh": "付费用户跟进", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "enclosure_followup", "category": "ops",
        "dir": "宣萱_不同围场月度付费用户跟进_D-1",
        "name_zh": "围场月度跟进", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "monthly_followup", "category": "ops",
        "dir": "宣萱_月度付费用户跟进_D-1",
        "name_zh": "月度付费跟进", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "trial_class", "category": "ops",
        "dir": "宣萱_首次体验课课前课后跟进_D-1",
        "name_zh": "课前课后跟进", "freq": "D-1",
        "priority": "P1", "update_frequency": "daily", "is_single_point": False,
    },
    {
        "id": "pre_class_outreach", "category": "ops",
        "dir": "宣萱_明细表-泰国课前外呼覆盖_D-1",
        "name_zh": "课前外呼覆盖", "freq": "D-1",
        "priority": "P2", "update_frequency": "daily", "is_single_point": False,
    },
]

# 简单内存状态缓存
_status_cache: list[dict[str, Any]] | None = None


def set_service(service: Any) -> None:
    global _service
    _service = service


def _build_status() -> list[dict[str, Any]]:
    """扫描 input/ 子目录，判断各数据源文件是否存在及 T-1 状态"""
    from datetime import datetime, timedelta
    import re

    today = datetime.now()
    t1_date = (today - timedelta(days=1)).date()

    status_list = []
    for src in DATA_SOURCE_REGISTRY:
        src_dir = INPUT_DIR / src["dir"]
        files = list(src_dir.glob("*.xlsx")) if src_dir.exists() else []

        latest_file = None
        latest_date = None
        is_t1 = False

        if files:
            # 按修改时间排序取最新
            files_sorted = sorted(files, key=lambda f: f.stat().st_mtime, reverse=True)
            latest_file = files_sorted[0]
            m = re.search(r"(\d{8})", latest_file.name)
            if m:
                try:
                    latest_date = datetime.strptime(m.group(1), "%Y%m%d").date()
                    is_t1 = latest_date == t1_date
                except ValueError:
                    pass

        status_list.append(
            {
                "id": src["id"],
                "name_zh": src["name_zh"],
                "priority": src["priority"],
                "update_frequency": src["update_frequency"],
                "is_single_point": src["is_single_point"],
                "dir": src["dir"],
                "has_file": len(files) > 0,
                "latest_file": latest_file.name if latest_file else None,
                "latest_date": str(latest_date) if latest_date else None,
                "is_t1": is_t1,
                "file_count": len(files),
            }
        )
    return status_list


@router.get("/status")
def get_datasource_status() -> list[dict[str, Any]]:
    """返回所有数据源当前状态（含 T-1 判断）"""
    global _status_cache
    if _status_cache is not None:
        return _status_cache
    _status_cache = _build_status()
    return _status_cache


@router.get("/registry")
def get_registry() -> list[dict[str, Any]]:
    """返回数据源注册表（12 源元信息）"""
    return DATA_SOURCE_REGISTRY


@router.post("/refresh")
def refresh_status() -> dict[str, Any]:
    """清空状态缓存并重新扫描"""
    global _status_cache
    _status_cache = None
    _status_cache = _build_status()
    return {"status": "ok", "refreshed": len(_status_cache)}


@router.post("/upload")
async def upload_file(
    source_id: str = Form(...),
    file: UploadFile = File(...),
) -> dict[str, Any]:
    """上传数据源文件，保存到 input/{source_dir}/ 目录"""
    # 查找对应 source dir
    registry_entry = next(
        (s for s in DATA_SOURCE_REGISTRY if s["id"] == source_id), None
    )
    if registry_entry is None:
        raise HTTPException(
            status_code=400,
            detail=f"未知数据源 ID: {source_id}，可用: {[s['id'] for s in DATA_SOURCE_REGISTRY]}",
        )

    target_dir = INPUT_DIR / registry_entry["dir"]
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = Path(file.filename or "upload.xlsx").name  # 防路径穿越
    target_path = target_dir / filename

    try:
        content = await file.read()
        target_path.write_bytes(content)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    # 清空状态缓存，下次自动重建
    global _status_cache
    _status_cache = None

    return {
        "status": "ok",
        "source_id": source_id,
        "saved_to": str(target_path),
        "size_bytes": len(content),
    }
