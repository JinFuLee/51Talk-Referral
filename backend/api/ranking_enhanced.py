from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query

from .dependencies import get_service
from services.analysis_service import AnalysisService

router = APIRouter()


@router.get("/cc-ranking-enhanced")
def get_cc_ranking_enhanced(
    top_n: int = Query(default=20, ge=1, le=100),
    svc: AnalysisService = Depends(get_service),
):
    """A4 增强排名：在现有 CC 排名基础上补充 reserve_rate/attend_rate"""
    cache = svc.get_cached_result()
    if not cache:
        raise HTTPException(status_code=404, detail="no_data")

    cc_ranking = cache.get("cc_ranking", {})
    profiles = []
    if isinstance(cc_ranking, dict):
        profiles = cc_ranking.get("profiles", []) or cc_ranking.get("items", []) or []
    elif isinstance(cc_ranking, list):
        profiles = cc_ranking

    # 从 raw_data 补充 reserve/attend 维度
    raw_data = getattr(svc, "_raw_data", None) or {}
    leads = raw_data.get("leads", {}) if isinstance(raw_data, dict) else {}
    records = leads.get("records", []) if isinstance(leads, dict) else []

    # 按 CC 聚合 reserve/attend
    cc_extra: dict[str, dict[str, int]] = {}
    if isinstance(records, list):
        for rec in records:
            if not isinstance(rec, dict):
                continue
            cc = rec.get("cc_name") or rec.get("seller") or rec.get("name", "")
            if not cc:
                continue
            if cc not in cc_extra:
                cc_extra[cc] = {"total": 0, "reserved": 0, "attended": 0}
            cc_extra[cc]["total"] += 1
            if rec.get("reserved") or rec.get("预约"):
                cc_extra[cc]["reserved"] += 1
            if rec.get("attended") or rec.get("出席"):
                cc_extra[cc]["attended"] += 1

    enhanced = []
    for p in profiles[:top_n]:
        if not isinstance(p, dict):
            continue
        name = p.get("cc_name") or p.get("name", "")
        extra = cc_extra.get(name, {})
        total = extra.get("total") or 1
        enhanced.append({
            **p,
            # Ensure cc_name is always set
            "cc_name": name,
            "team": p.get("team"),
            "composite_score": p.get("composite_score", 0),
            # Result metrics
            "registrations": p.get("registrations", 0),
            "payments": p.get("payments", 0),
            "revenue_usd": p.get("revenue_usd", 0),
            # Efficiency metrics
            "contact_rate": p.get("contact_rate"),
            "checkin_rate": p.get("checkin_rate", 0),
            "participation_rate": p.get("participation_rate", 0),
            "coefficient": p.get("bring_new_coeff") or p.get("coefficient", 0),
            "conversion_rate": p.get("conversion_rate", 0),
            # Enhanced fields
            "reserve_rate": round(extra.get("reserved", 0) / total, 4) if total else 0,
            "attend_rate": round(extra.get("attended", 0) / total, 4) if total else 0,
            "total_leads": extra.get("total", 0),
        })

    return {"profiles": enhanced, "total": len(enhanced)}
