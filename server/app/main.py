"""FastAPI 入口：同源托管前端静态产物 + /api 统一接口。

启动时不加载任何重的第三方引擎（惰性 provider），因此即使
argostranslate / edge-tts 未安装，服务也能正常起来并提供降级能力。
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import __version__
from .cache import LRUCache
from .config import get_settings
from .providers import build_translator_chain, build_tts_chain
from .routers import health, translate, tts
from .runtime import Runtime
from .schemas import ErrorResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
)
logger = logging.getLogger("korean.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    text_cache: LRUCache = LRUCache(
        max_entries=settings.cache_max_entries,
        ttl_seconds=settings.cache_ttl_seconds,
        enabled=settings.cache_enabled,
    )
    audio_cache: LRUCache = LRUCache(
        max_entries=max(32, settings.cache_max_entries // 2),
        ttl_seconds=settings.cache_ttl_seconds,
        max_bytes=settings.cache_max_bytes,
        enabled=settings.cache_enabled,
    )
    translators = build_translator_chain(settings)
    tts_chain = build_tts_chain(settings)

    warnings: list[str] = []
    if not any(r.available for r in translators.reports()):
        warnings.append(
            "所有翻译引擎均未就绪：运行 server/scripts/setup_argos.py 安装离线语言包，"
            "或确认服务器可访问在线翻译接口"
        )
    if not any(r.available for r in tts_chain.reports()):
        warnings.append("服务端发音引擎未就绪，将由浏览器 Web Speech API 兜底")

    app.state.runtime = Runtime(
        settings=settings,
        text_cache=text_cache,
        audio_cache=audio_cache,
        translators=translators,
        tts=tts_chain,
        warnings=warnings,
    )
    logger.info(
        "ready version=%s chain=%s tts=%s static=%s",
        __version__,
        settings.translate_chain,
        settings.tts_provider,
        settings.static_dir,
    )
    yield
    text_cache.clear()
    audio_cache.clear()
    logger.info("shutdown complete")


app = FastAPI(
    title="中→韩 翻译发音台 API",
    version=__version__,
    description="轻量、零付费的中文到韩语翻译与语速可调朗读服务",
    lifespan=lifespan,
)

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def timing(request: Request, call_next):
    started = time.monotonic()
    response = await call_next(request)
    cost = int((time.monotonic() - started) * 1000)
    # 只记录路径与耗时，绝不记录请求体（可能含用户原文）
    logger.info("%s %s -> %s %dms", request.method, request.url.path, response.status_code, cost)
    response.headers["X-Elapsed-Ms"] = str(cost)
    return response


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    logger.error("unhandled error path=%s error=%s", request.url.path, type(exc).__name__)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="服务器内部错误",
            code="INTERNAL_ERROR",
            hint="请查看服务日志；多数情况下重试或切换 provider 即可恢复",
        ).model_dump(),
    )


app.include_router(translate.router, prefix="/api")
app.include_router(tts.router, prefix="/api")
app.include_router(health.router, prefix="/api")


@app.get("/api/info", include_in_schema=False)
def info():
    return {"name": "中→韩 翻译发音台", "version": __version__, "docs": "/docs"}


# ---- 选型文档（只读静态，供页面底部「选型说明」链接访问） ----
_repo_docs = Path(_settings.project_root) / "docs"
if _repo_docs.is_dir():
    app.mount(
        "/repo-docs",
        StaticFiles(directory=str(_repo_docs)),
        name="repo-docs",
    )


# ---- 静态前端（同源部署，消除 CORS） ----
_dist = Path(_settings.static_dir)
if (_dist / "index.html").is_file():
    _assets = _dist / "assets"
    if _assets.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(
                status_code=404,
                content=ErrorResponse(error="接口不存在", code="NOT_FOUND").model_dump(),
            )
        candidate = (_dist / full_path).resolve()
        if candidate.is_file() and _dist.resolve() in candidate.parents:
            return FileResponse(str(candidate))
        return FileResponse(str(_dist / "index.html"))
else:
    logger.warning("static dir not built yet: %s (仅 API 可用)", _dist)

    @app.get("/", include_in_schema=False)
    def root():
        return JSONResponse(
            content={
                "message": "前端尚未构建",
                "hint": "在 web/ 下执行 npm install && npm run build，或直接用 Docker 构建",
                "api": "/api/health",
                "docs": "/docs",
            }
        )
