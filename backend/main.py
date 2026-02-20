"""
ref-ops-engine FastAPI 主入口
51Talk 泰国转介绍运营分析引擎 REST API
"""
import sys
from pathlib import Path

# 确保项目根（src/）和 backend/（core/）均可被导入
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import analysis, reports, datasources, config, snapshots, notifications, health, insights
from services.analysis_service import AnalysisService

app = FastAPI(
    title="ref-ops-engine API",
    description="51Talk 泰国转介绍运营分析引擎 REST API",
    version="9.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 单例 AnalysisService，注入到各路由模块
_analysis_service = AnalysisService(project_root=PROJECT_ROOT)

app.include_router(health.router, prefix="/api")
app.include_router(
    analysis.router,
    prefix="/api/analysis",
    tags=["analysis"],
)
app.include_router(
    reports.router,
    prefix="/api/reports",
    tags=["reports"],
)
app.include_router(
    datasources.router,
    prefix="/api/datasources",
    tags=["datasources"],
)
app.include_router(
    config.router,
    prefix="/api/config",
    tags=["config"],
)
app.include_router(
    snapshots.router,
    prefix="/api/snapshots",
    tags=["snapshots"],
)
app.include_router(
    notifications.router,
    prefix="/api/notifications",
    tags=["notifications"],
)
app.include_router(
    insights.router,
    prefix="/api/analysis",
    tags=["insights"],
)


@app.on_event("startup")
async def startup_event():
    """启动时初始化服务"""
    # 将单例注入到各路由模块
    analysis.set_service(_analysis_service)
    reports.set_service(_analysis_service)
    datasources.set_service(_analysis_service)
    config.set_service(_analysis_service)
    snapshots.set_service(_analysis_service)
    notifications.set_service(_analysis_service)

    # 后台自动运行分析（非阻塞）
    import asyncio
    asyncio.create_task(_auto_run_analysis())


async def _auto_run_analysis():
    """启动后自动运行一次分析（非阻塞），仅当 input 目录有数据文件时"""
    import logging
    logger = logging.getLogger(__name__)
    input_dir = PROJECT_ROOT / "input"
    # 检查 input 目录下是否有任何 xlsx 文件
    xlsx_files = list(input_dir.rglob("*.xlsx")) if input_dir.exists() else []
    if not xlsx_files:
        logger.info("input 目录无数据文件，跳过启动自动分析")
        return
    try:
        logger.info(f"检测到 {len(xlsx_files)} 个数据文件，开始启动自动分析...")
        _analysis_service.run()
        logger.info("启动自动分析完成")
    except Exception as e:
        logger.warning(f"启动自动分析失败（非阻塞）: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
