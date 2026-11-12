"""POST /api/tts 与 GET /api/voices — 韩语朗读，语速统一 0.5~1.5 倍。

服务端不可用时返回 503 + 明确 hint，前端据此自动降级到浏览器 Web Speech API。
"""

from __future__ import annotations

import re

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response

from ..cache import cache_key
from ..config import Settings
from ..schemas import (
    ErrorResponse,
    TtsRequest,
    VoiceItem,
    VoicesResponse,
    clean_text,
)

router = APIRouter()

VOICE_PATTERN = re.compile(r"^[A-Za-z]{2,3}-[A-Za-z]{2,4}-[A-Za-z0-9]+Neural$")


def _error(status: int, message: str, code: str, hint: str = "") -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content=ErrorResponse(error=message, code=code, hint=hint).model_dump(),
    )


def _label(voice_id: str) -> str:
    names = {
        "SunHi": "선희 · 女声",
        "InJoon": "인준 · 男声",
        "Hyunsu": "현수 · 男声",
        "SoonBok": "순복 · 女声",
    }
    for token, label in names.items():
        if token in voice_id:
            return label
    return voice_id


def _gender(voice_id: str) -> str:
    if "SunHi" in voice_id or "SoonBok" in voice_id:
        return "female"
    if "InJoon" in voice_id or "Hyunsu" in voice_id:
        return "male"
    return "unknown"


def default_voices(settings: Settings) -> list[VoiceItem]:
    return [
        VoiceItem(id=v, label=_label(v), gender=_gender(v)) for v in settings.voices
    ]


@router.get("/voices", response_model=VoicesResponse)
def voices(request: Request):
    runtime = request.app.state.runtime
    settings = runtime.settings
    live = runtime.tts.list_voices()
    items = (
        [VoiceItem(id=v.id, label=v.label, gender=v.gender) for v in live]
        if live
        else default_voices(settings)
    )
    provider = runtime.tts.providers[0].name if runtime.tts.providers else "none"
    return VoicesResponse(voices=items, provider=provider, browserFallback=True)


@router.post("/tts")
def tts(payload: TtsRequest, request: Request):
    runtime = request.app.state.runtime
    settings = runtime.settings

    text = clean_text(payload.text)
    if not text:
        return _error(400, "朗读内容为空", "EMPTY_TEXT")
    if len(text) > settings.max_tts_length:
        return _error(
            413,
            f"朗读文本过长（{len(text)} 字符），上限 {settings.max_tts_length}",
            "TEXT_TOO_LONG",
            "请分句朗读",
        )

    voice = payload.voice or settings.default_voice
    if not VOICE_PATTERN.match(voice):
        return _error(400, "语音标识格式不合法", "INVALID_VOICE")

    rate = settings.clamp_rate(payload.rate)
    key = cache_key("tts", text, voice, rate)
    hit = runtime.audio_cache.get(key)
    if hit is not None:
        return Response(
            content=hit,
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=86400", "X-TTS-Cache": "HIT"},
        )

    try:
        result = runtime.tts.synthesize(text, voice, rate)
    except Exception as exc:  # noqa: BLE001
        return _error(
            503,
            "服务端发音不可用",
            "NO_TTS",
            "将自动改用浏览器语音朗读。若需服务端神经语音，请检查 "
            "edge-tts 是否安装、服务器能否访问 speech.platform.bing.com。详情："
            + str(exc)[:160],
        )

    runtime.audio_cache.set(key, result.audio)
    return Response(
        content=result.audio,
        media_type=result.content_type,
        headers={
            "Cache-Control": "public, max-age=86400",
            "X-TTS-Cache": "MISS",
            "X-TTS-Provider": result.provider,
        },
    )
