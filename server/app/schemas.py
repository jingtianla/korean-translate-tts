"""统一 REST 契约。字段名与前端 TypeScript 类型一一对应。"""

from __future__ import annotations

from pydantic import BaseModel, Field


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    source: str = Field(default="zh", max_length=8)
    target: str = Field(default="ko", max_length=8)


class TranslateResponse(BaseModel):
    text: str
    provider: str
    viaPivot: bool = False
    cached: bool = False
    degraded: bool = False
    warning: str | None = None
    elapsedMs: int = 0
    segments: list[str] = Field(default_factory=list)
    # 罗马字转写由前端 hangul 模块按译文计算，后端不重复实现
    romanized: str | None = None


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    voice: str = Field(default="ko-KR-SunHiNeural", max_length=64)
    rate: float = Field(default=1.0, ge=0.1, le=3.0)


class VoiceItem(BaseModel):
    id: str
    label: str
    gender: str = "unknown"


class VoicesResponse(BaseModel):
    voices: list[VoiceItem]
    provider: str
    browserFallback: bool = True


class ProviderState(BaseModel):
    name: str
    available: bool
    detail: str = ""


class HealthResponse(BaseModel):
    status: str  # ok | degraded | error
    version: str
    uptimeSeconds: int
    translateChain: list[ProviderState]
    tts: ProviderState
    cache: dict[str, int | float | bool]
    warnings: list[str] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: str
    code: str
    hint: str = ""


def clean_text(text: str) -> str:
    """过滤控制字符并压缩空白，保留换行用于分句。"""
    cleaned = "".join(
        ch if ch in "\n\t" or ord(ch) >= 32 else " " for ch in text
    )
    return cleaned.strip()


def split_sentences(text: str, limit: int = 480) -> list[str]:
    """按中文标点分句；超长片段再按长度硬切，便于逐句翻译与朗读。"""
    import re

    parts = re.split(r"(?<=[。！？!?；;\n])", text)
    chunks: list[str] = []
    buffer = ""
    for part in parts:
        if not part.strip():
            continue
        if len(buffer) + len(part) > limit and buffer:
            chunks.append(buffer.strip())
            buffer = part
        else:
            buffer += part
        while len(buffer) > limit:
            chunks.append(buffer[:limit].strip())
            buffer = buffer[limit:]
    if buffer.strip():
        chunks.append(buffer.strip())
    return chunks or [text[:limit]]
