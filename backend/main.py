"""
ref-ops-engine FastAPI 主入口
51Talk 泰国转介绍运营分析引擎 REST API
"""
import asyncio
import importlib
import logging
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from services.analysis_service import AnalysisService
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# ── 路由注册表 ─────────────────────────────────────────────────────────────────
# 格式：router_key → (module_path, prefix, tags)
# router_key 与 ProjectConfig.enabled_routers 中的字符串对应
ROUTER_REGISTRY: dict = {
    "health":               ("api.health",               "/api",               []),
    "analysis":             ("api.analysis",             "/api/analysis",      ["analysis"]),
    "reports":              ("api.reports",              "/api/reports",       ["reports"]),
    "datasources":          ("api.datasources",          "/api/datasources",   ["datasources"]),
    "config":               ("api.config",               "/api/config",        ["config"]),
    "snapshots":            ("api.snapshots",            "/api/snapshots",     ["snapshots"]),
    "insights":             ("api.insights",             "/api/analysis",      ["insights"]),
    "system":               ("api.system",               "",                   []),
    "cohort_detail":        ("api.cohort_detail",        "/api/analysis",      ["cohort"]),
    "channel_trend":        ("api.channel_trend",        "/api/analysis",      ["channel"]),
    "outreach_heatmap":     ("api.outreach_heatmap",     "/api/analysis",      ["outreach"]),
    "outreach_coverage":    ("api.outreach_coverage",    "/api/analysis",      ["outreach"]),
    "cohort_decay":         ("api.cohort_decay",         "/api/analysis",      ["cohort-decay"]),
    "north_star":           ("api.north_star",           "/api/analysis",      ["north-star"]),
    "paid_followup":        ("api.paid_followup",        "/api/analysis",      ["paid-followup"]),
    "cohort_student":       ("api.cohort_student",       "/api/analysis",      ["cohort-student"]),
    "funnel_detail":        ("api.funnel_detail",        "/api/analysis",      ["funnel-detail"]),
    "channel_mom":          ("api.channel_mom",          "/api/analysis",      ["channel-mom"]),
    "retention_rank":       ("api.retention_rank",       "/api/analysis",      ["retention"]),
    "leads_detail":         ("api.leads_detail",         "/api/analysis",      ["leads-detail"]),
    "productivity_history": ("api.productivity_history", "/api/analysis",      ["productivity"]),
    "outreach_gap":         ("api.outreach_gap",         "/api/analysis",      ["outreach-gap"]),
    "enclosure_health":     ("api.enclosure_health",     "/api/analysis",      ["enclosure-health"]),
    "ranking_enhanced":     ("api.ranking_enhanced",     "/api/analysis",      ["ranking-enhanced"]),
    "presentation":         ("api.presentation",         "/api/analysis",      ["presentation"]),
    "member_profile":       ("api.member",               "/api/member",        ["member-profile"]),
}


def _load_routers(enabled_routers: list[str] | None = None) -> list:
    """
    动态导入并返回路由模块列表。
    enabled_routers 为 None 时启用全部（向后兼容）。
    返回 [(module, prefix, tags), ...]
    """
    keys = enabled_routers if enabled_routers is not None else list(ROUTER_REGISTRY.keys())
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
    from core.project_config import load_project_config
    _project_config = load_project_config("referral")
    _display_name = _project_config.display_name
    _enabled_routers: list[str] | None = (
        _project_config.enabled_routers if _project_config.enabled_routers else None
    )
except Exception as _cfg_err:
    logger.warning(f"ProjectConfig 加载失败，使用默认配置: {_cfg_err}")
    _display_name = "ref-ops-engine"
    _enabled_routers = None

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

app = FastAPI(
    title=f"{_display_name} API",
    description="51Talk 泰国转介绍运营分析引擎 REST API",
    version="9.0.0"
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
    """为所有响应注入安全响应头"""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


app.add_middleware(SecurityHeadersMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback

    debug = os.getenv("DEBUG", "false").lower() == "true"
    detail = traceback.format_exc() if debug else "Internal server error"
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}")
    return JSONResponse(status_code=500, content={"detail": detail})


# 单例 AnalysisService，注入到各路由模块
_analysis_service = AnalysisService(project_root=PROJECT_ROOT)

# 动态加载并注册路由
_loaded_routers = _load_routers(_enabled_routers)
for _key, _mod, _prefix, _tags in _loaded_routers:
    kwargs: dict = {}
    if _prefix:
        kwargs["prefix"] = _prefix
    if _tags:
        kwargs["tags"] = _tags
    app.include_router(_mod.router, **kwargs)


@app.on_event("startup")
async def startup_event():
    """启动时初始化服务"""
    # 挂载单例到 app.state，所有路由通过 Depends(get_service) 获取
    app.state.service = _analysis_service

    # 后台自动运行分析（非阻塞）
    asyncio.create_task(_auto_run_analysis())


async def _auto_run_analysis():
    """启动后自动运行一次分析（非阻塞），仅当 input 目录有数据文件时"""
    input_dir = PROJECT_ROOT / "input"
    # 检查 input 目录下是否有任何 xlsx 文件
    xlsx_files = list(input_dir.rglob("*.xlsx")) if input_dir.exists() else []
    if not xlsx_files:
        logger.info("input 目录无数据文件，跳过启动自动分析")
        return
    try:
        logger.info(f"检测到 {len(xlsx_files)} 个数据文件，开始启动自动分析...")
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _analysis_service.run)
        logger.info("启动自动分析完成")
    except Exception as e:
        logger.warning(f"启动自动分析失败（非阻塞）: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
