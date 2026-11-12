"""GET /api/health — provider 就绪状态、缓存统计与降级提示。"""

from __future__ import annotations

from fastapi import APIRouter, Request

from .. import __version__
from ..schemas import HealthResponse, ProviderState

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health(request: Request):
    runtime = request.app.state.runtime
    settings = runtime.settings

    translator_states = [
        ProviderState(name=r.name, available=r.available, detail=r.detail)
        for r in runtime.translators.reports()
    ]
    tts_states = runtime.tts.reports()
    tts_state = (
        ProviderState(
            name=tts_states[0].name,
            available=tts_states[0].available,
            detail=tts_states[0].detail,
        )
        if tts_states
        else ProviderState(name="none", available=False, detail="未构建任何发音引擎")
    )

    ready_translators = sum(1 for s in translator_states if s.available)
    warnings = list(runtime.warnings)
    if ready_translators == 0:
        warnings.append("无可用翻译引擎：请安装 Argos 语言包或检查在线接口连通性")
    elif not translator_states[0].available:
        warnings.append("默认离线翻译未就绪，已启用备选在线引擎")
    if not tts_state.available:
        warnings.append("服务端发音不可用，前端将使用浏览器语音（Web Speech API）")

    if ready_translators == 0 and not tts_state.available:
        status = "error"
    elif warnings:
        status = "degraded"
    else:
        status = "ok"

    return HealthResponse(
        status=status,
        version=__version__,
        uptimeSeconds=runtime.uptime_seconds,
        translateChain=translator_states,
        tts=tts_state,
        cache={
            **{f"text_{k}": v for k, v in runtime.text_cache.stats().items()},
            **{f"audio_{k}": v for k, v in runtime.audio_cache.stats().items()},
            "rateMin": settings.rate_min,
            "rateMax": settings.rate_max,
        },
        warnings=warnings,
    )
