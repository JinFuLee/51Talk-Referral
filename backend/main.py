"""
ref-ops-engine FastAPI 主入口
51Talk 泰国转介绍运营分析引擎 REST API
"""

import importlib
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from backend.api import filter_options as _filter_options_mod
from backend.core.date_override import set_request_month

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent

logger = logging.getLogger(__name__)

# ── 路由注册表 ─────────────────────────────────────────────────────────────────
# 格式：router_key → (module_path, prefix, tags)
# router_key 与 ProjectConfig.enabled_routers 中的字符串对应
ROUTER_REGISTRY: dict = {
    "health": ("backend.api.health", "/api", []),
    "system": ("backend.api.system", "", []),
    "config": ("backend.api.config", "/api/config", ["config"]),
    "reports": ("backend.api.reports", "/api/reports", ["reports"]),
    "datasources": ("backend.api.datasources", "/api/datasources", ["datasources"]),
    "presentation": ("backend.api.presentation", "/api/presentation", ["presentation"]),
    # ── Phase2 新增：转介绍中台监测分析端点 ──────────────────────────────────────
    "overview": ("backend.api.overview", "/api", ["overview"]),
    "funnel": ("backend.api.funnel", "/api", ["funnel"]),
    "enclosure": ("backend.api.enclosure", "/api", ["enclosure"]),
    "channel": ("backend.api.channel", "/api", ["channel"]),
    "member_detail": ("backend.api.member_detail", "/api", ["members"]),
    "high_potential": ("backend.api.high_potential", "/api", ["high-potential"]),
    "team_ranking": ("backend.api.team_ranking", "/api", ["team"]),
    "outreach_quality": ("backend.api.outreach_quality", "/api", ["analysis"]),
    "checkin": ("backend.api.checkin", "/api", ["checkin"]),
    "checkin_roi": ("backend.api.checkin_roi", "/api", ["checkin-roi"]),
    # ── Wave 1 新增：交叉分析引擎 API ──────────────────────────────────────────
    "attribution": ("backend.api.attribution", "/api", ["attribution"]),
    "hp_warroom": ("backend.api.hp_warroom", "/api", ["high-potential"]),
    # ── Wave 2-4 新增：日报监控 + CC矩阵 + 围场健康 + 学员360 ─────────────────
    "daily_monitor": ("backend.api.daily_monitor", "/api", ["daily-monitor"]),
    "cc_matrix": ("backend.api.cc_matrix", "/api", ["cc-matrix"]),
    "enclosure_health": ("backend.api.enclosure_health", "/api", ["enclosure-health"]),
    "student_360": ("backend.api.student_360", "/api", ["students"]),
    "indicator_matrix": ("backend.api.indicator_matrix", "/api", ["indicator-matrix"]),
    # ── Wave 5 新增：SS/LP 围场 + 次卡预警 + 激励效果 + 续费风险 ──────────────
    "enclosure_ss_lp": ("backend.api.enclosure_ss_lp", "/api", ["enclosure-ss-lp"]),
    "expiry_alert": ("backend.api.expiry_alert", "/api", ["students"]),
    "incentive_effect": ("backend.api.incentive_effect", "/api", ["analysis"]),
    "renewal_risk": ("backend.api.renewal_risk", "/api", ["analysis"]),
    # ── Wave 3 新增：学习热图 + 地理分布 ──────────────────────────────────────
    "learning_heatmap": ("backend.api.learning_heatmap", "/api", ["analysis"]),
    "geo_distribution": ("backend.api.geo_distribution", "/api", ["analysis"]),
    # ── Wave 6 新增：跟进质量 + 推荐者贡献 ────────────────────────────────────
    "followup_quality": ("backend.api.followup_quality", "/api", ["analysis"]),
    "referral_contributor": ("backend.api.referral_contributor", "/api", ["analysis"]),
    # ── M33 新增：统一报告引擎 API ─────────────────────────────────────────────
    "report": ("backend.api.report", "/api", ["report"]),
    # ── 通知推送管理 ────────────────────────────────────────────────────────────
    "notifications": ("backend.api.notifications", "/api", ["notifications"]),
    # ── 知识库 ──────────────────────────────────────────────────────────────────
    "knowledge": ("backend.api.knowledge", "/api", ["knowledge"]),
    # ── CC 个人业绩全维度 ────────────────────────────────────────────────────────
    "cc_performance": ("backend.api.cc_performance", "/api", ["cc-performance"]),
    # ── 内场激励系统 ─────────────────────────────────────────────────────────────
    "incentive": ("backend.api.incentive_engine", "/api/incentive", ["incentive"]),
    # ── 数据管线诊断 ─────────────────────────────────────────────────────────────
    "data_health": ("backend.api.data_health", "/api/data-health", ["data-health"]),
    # ── 数据口径守卫 Dashboard ─────────────────────────────────────────────────
    "caliber_guard": ("backend.api.caliber_guard", "/api", ["caliber-guard"]),
    # ── 权限管理 ─────────────────────────────────────────────────────────────────
    "access_control": ("backend.api.access_control", "/api", ["access-control"]),
    # ── M38 新增：历史归档 ────────────────────────────────────────────────────────
    "archives": ("backend.api.archives", "/api", ["archives"]),
    # ── 今日实时成交 ─────────────────────────────────────────────────────────────
    "live_orders": ("backend.api.live_orders", "/api", ["live-orders"]),
}


def _load_routers(enabled_routers: list[str] | None = None) -> list:
    """
    动态导入并返回路由模块列表。
    enabled_routers 为 None 时启用全部（向后兼容）。
    返回 [(module, prefix, tags), ...]
    """
    keys = (
        enabled_routers if enabled_routers is not None else list(ROUTER_REGISTRY.keys())
    )
    loaded = []
    for key in keys:
        if key not in ROUTER_REGISTRY:
            logger.warning(f"未知路由 key: {key}，跳过")
            continue
        mod_path, prefix, tags = ROUTER_REGISTRY[key]
        try:
            mod = importlib.import_module(mod_path)
            loaded.append((key, mod, prefix, tags))
        except ImportError as e:
            logger.error(f"路由模块导入失败 [{key}] {mod_path}: {e}")
    return loaded


# ── 尝试加载 ProjectConfig（可选，失败时降级为默认行为）────────────────────────
_project_config = None
try:
    from backend.core.project_config import load_project_config

    _project_config = load_project_config("referral")
    _display_name = _project_config.display_name
    _enabled_routers: list[str] | None = (
        _project_config.enabled_routers if _project_config.enabled_routers else None
    )
except Exception as _cfg_err:
    logger.warning(f"ProjectConfig 加载失败，使用默认配置: {_cfg_err}")
    _display_name = "ref-ops-engine"
    _enabled_routers = None

# RATE_LIMIT 环境变量格式示例: "60/minute" / "1000/hour"
# 未设置时默认 60/minute
_rate_limit_str = os.getenv("RATE_LIMIT", "60/minute")
limiter = Limiter(key_func=get_remote_address, default_limits=[_rate_limit_str])

@asynccontextmanager
async def lifespan(app: FastAPI):
    import shutil

    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    from backend.api.dependencies import _create_data_manager
    from backend.api.notifications import _sync_scheduler
    from backend.core.file_watcher import FileWatcher

    dm = _create_data_manager()
    app.state.data_manager = dm
    dm.load_all()

    # M33: 初始化日快照 SQLite 表
    try:
        from backend.core.daily_snapshot_service import DailySnapshotService
        DailySnapshotService()  # __init__ 内部自动调用 _ensure_schema()
        logger.info("✓ 日快照 SQLite 表已初始化")
    except Exception as _snap_err:
        logger.warning(f"日快照表初始化失败（非致命）: {_snap_err}")

    # config/ 完整性检测与自动恢复
    config_dir = PROJECT_ROOT / "config"
    expected_files = [
        "targets_override.json",
        "exchange_rate.json",
        "indicator_matrix_override.json",
    ]
    missing = [f for f in expected_files if not (config_dir / f).exists()]
    if missing:
        logger.warning(f"⚠ config/ 缺失文件（将使用默认值）: {missing}")
        backup_dir = config_dir / "backups"
        if backup_dir.exists():
            for f in missing:
                stem = Path(f).stem
                suffix = Path(f).suffix
                backups = sorted(backup_dir.glob(f"{stem}_*{suffix}"), reverse=True)
                if backups:
                    shutil.copy2(backups[0], config_dir / f)
                    logger.info(f"✓ 从备份恢复: {f} ← {backups[0].name}")

    # APScheduler 启动并加载持久化排程
    scheduler = AsyncIOScheduler(timezone="Asia/Bangkok")
    scheduler.start()
    app.state.scheduler = scheduler
    _sync_scheduler(app.state)
    logger.info("✓ APScheduler 已启动，加载持久化排程完成")

    # M33: 每日 09:30 自动写入 T-1 快照（兜底，防止无人访问导致当天数据丢失）
    def _daily_snapshot_job():
        try:
            from datetime import timedelta as _td

            from backend.core.channel_funnel_engine import ChannelFunnelEngine
            from backend.core.daily_snapshot_service import DailySnapshotService
            from backend.core.date_override import get_today as _get_today
            ref = _get_today() - _td(days=1)
            svc = DailySnapshotService()
            if svc.query_by_date(ref) and svc.query_by_date(ref).get("total"):
                return  # 已有快照，跳过
            funnel = ChannelFunnelEngine(dm)
            snap = funnel.compute_as_snapshot_format(dm.load_all())
            if snap:
                svc.write_daily(snap, snapshot_date=ref)
                logger.info("✓ 定时快照写入: %s", ref.isoformat())
        except Exception as exc:
            logger.warning("定时快照失败（非致命）: %s", exc)

    def _daily_thai_snapshot_job():
        """泰国口径快照：写入 JSONL 供 overview sparkline/MoM 消费"""
        try:
            import json
            import math
            from pathlib import Path

            from backend.core.data_manager import DataManager as _DM

            data = dm.load_all()
            result_df = data.get("result")
            if result_df is None or result_df.empty:
                return

            thai_df = _DM.filter_thai_region(
                result_df, fallback_to_all=True
            )
            row = thai_df.iloc[0]

            kpi_keys = {
                "转介绍注册数": "转介绍注册数",
                "预约数": "预约数",
                "出席数": "出席数",
                "转介绍付费数": "转介绍付费数",
                "总带新付费金额USD": "总带新付费金额USD",
            }
            snap: dict = {}
            for col, key in kpi_keys.items():
                val = row.get(col)
                if val is not None:
                    try:
                        f = float(val)
                        if not math.isnan(f):
                            snap[key] = f
                    except (ValueError, TypeError):
                        pass

            if snap:
                from datetime import date as _date

                _root = Path(__file__).resolve().parent.parent
                snap_dir = _root / "output" / "snapshots"
                snap_dir.mkdir(parents=True, exist_ok=True)
                snap_file = snap_dir / f"{_date.today().isoformat()}.jsonl"
                snap_file.write_text(
                    json.dumps(snap, ensure_ascii=False) + "\n",
                    encoding="utf-8",
                )
                logger.info("✓ 泰国口径快照写入: %s", snap_file.name)
        except Exception as exc:
            logger.warning("泰国口径快照失败（非致命）: %s", exc)

    scheduler.add_job(
        _daily_snapshot_job, "cron",
        hour=10, minute=30, id="m33_daily_snapshot",
        replace_existing=True,
    )
    scheduler.add_job(
        _daily_thai_snapshot_job, "cron",
        hour=10, minute=35, id="m33_thai_snapshot",
        replace_existing=True,
    )
    logger.info("✓ M33 日快照定时任务已注册（10:30 全站 + 10:35 泰国）")

    watcher = FileWatcher(dm)
    watcher.start()
    app.state.file_watcher = watcher

    yield

    watcher.stop()
    scheduler.shutdown(wait=False)
    logger.info("✓ APScheduler 已关闭")


app = FastAPI(
    lifespan=lifespan,
    title=f"{_display_name} API",
    description="51Talk 泰国转介绍运营分析引擎 REST API",
    version="9.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """为所有响应注入安全响应头（含 CSP / Referrer-Policy / Permissions-Policy）"""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        return response


app.add_middleware(SecurityHeadersMiddleware)


class MonthMiddleware:
    """纯 ASGI middleware：从 ?month=YYYYMM 注入 contextvars。

    不使用 BaseHTTPMiddleware，因为 BaseHTTPMiddleware.dispatch 在独立 async task
    中执行，contextvars 不传播到 endpoint handler（Starlette #1315）。
    纯 ASGI middleware 在同一 async context 运行，contextvars 正确传播。
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            from urllib.parse import parse_qs

            qs = parse_qs(scope.get("query_string", b"").decode())
            month_values = qs.get("month", [])
            month = month_values[0] if month_values else None
            set_request_month(month)
            try:
                await self.app(scope, receive, send)
            finally:
                set_request_month(None)
        else:
            await self.app(scope, receive, send)


app.add_middleware(MonthMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback

    debug = os.getenv("DEBUG", "false").lower() == "true"
    detail = traceback.format_exc() if debug else "Internal server error"
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}")
    return JSONResponse(status_code=500, content={"detail": detail})


# 动态加载并注册路由
_loaded_routers = _load_routers(_enabled_routers)
for _key, _mod, _prefix, _tags in _loaded_routers:
    kwargs: dict = {}
    if _prefix:
        kwargs["prefix"] = _prefix
    if _tags:
        kwargs["tags"] = _tags
    app.include_router(_mod.router, **kwargs)

# ── 系统级路由（不受 enabled_routers 控制）────────────────────────────────────
app.include_router(_filter_options_mod.router, prefix="/api/filter", tags=["filter"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
