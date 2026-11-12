"""POST /api/translate — 中文 → 韩语。

缓存键含 text+source+target；命中直接返回。未命中按降级链调用 provider，
返回译文、是否经英语中转、是否降级等信息供前端做学习性提示。
"""

from __future__ import annotations

import time

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ..cache import cache_key
from ..schemas import ErrorResponse, TranslateRequest, TranslateResponse, clean_text

router = APIRouter()


def _error(status: int, message: str, code: str, hint: str = "") -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content=ErrorResponse(error=message, code=code, hint=hint).model_dump(),
    )


@router.post("/translate", response_model=TranslateResponse)
def translate(payload: TranslateRequest, request: Request):
    runtime = request.app.state.runtime
    settings = runtime.settings

    text = clean_text(payload.text)
    if not text:
        return _error(400, "输入内容为空", "EMPTY_TEXT", "请输入要翻译的中文内容")
    if len(text) > settings.max_text_length:
        return _error(
            413,
            f"文本过长（{len(text)} 字符），上限 {settings.max_text_length}",
            "TEXT_TOO_LONG",
            "请分段翻译，或调大 MAX_TEXT_LENGTH 环境变量",
        )

    key = cache_key("tr", text, payload.source, payload.target)
    hit = runtime.text_cache.get(key)
    if hit is not None:
        cached_response = TranslateResponse(**{**hit.model_dump(), "cached": True})
        return cached_response

    started = time.monotonic()
    try:
        result, degraded = runtime.translators.translate(
            text, payload.source, payload.target
        )
    except Exception as exc:  # noqa: BLE001
        return _error(
            503,
            "翻译服务暂时不可用",
            "NO_TRANSLATOR",
            "请检查语言包是否安装、服务器能否访问在线翻译接口；"
            "也可在设置中切换发音源后重试。详情：" + str(exc)[:180],
        )

    warning_parts: list[str] = []
    if result.via_pivot:
        warning_parts.append("该译文经英语中转生成，敬语与语体可能有偏差，建议结合语境核对")
    if degraded:
        warning_parts.append("已自动切换到备选翻译引擎")
    if result.warning:
        warning_parts.append(result.warning)

    response = TranslateResponse(
        text=result.text,
        provider=result.provider,
        viaPivot=result.via_pivot,
        cached=False,
        degraded=degraded,
        warning="；".join(warning_parts) or None,
        elapsedMs=int((time.monotonic() - started) * 1000),
        segments=result.segments,
    )
    runtime.text_cache.set(key, response)
    return response
