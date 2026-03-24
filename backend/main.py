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

    from backend.api.dependencies import _create_data_manager
    from backend.core.file_watcher import FileWatcher

    dm = _create_data_manager()
    app.state.data_manager = dm
    dm.load_all()

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

    watcher = FileWatcher(dm)
    watcher.start()
    app.state.file_watcher = watcher

    yield

    watcher.stop()


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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
