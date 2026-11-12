"""edge-tts 服务端发音 provider（LGPL-3.0，pip 独立依赖，不拷贝源码）。

已核验 vendor/edge-tts 7.3.1 源码：
- Communicate(text, voice, rate="+0%", volume, pitch)
- rate 必须匹配 ^[+-]\\d+%$，故用 rate_to_percent() 生成带符号百分比
- 语音名是透传字符串，仓库不内置语音表；list_voices() 运行时从微软端点拉取
- stream_sync() 逐块 yield {"type": "audio", "data": bytes}

风险：依赖非公开微软端点 speech.platform.bing.com，Token / Chromium 版本
变更即失效；失败时由上层返回 503，前端自动降级到 Web Speech API。
"""

from __future__ import annotations

import asyncio

from ..config import Settings
from ..schemas import VoiceItem
from .base import (
    ProviderError,
    ProviderReport,
    TtsProvider,
    TtsResult,
    Voice,
    rate_to_percent,
)


class EdgeTtsProvider(TtsProvider):
    name = "edge"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._voices: list[Voice] | None = None
        self._report: ProviderReport | None = None

    def _module(self):
        try:
            import edge_tts

            return edge_tts
        except ImportError as exc:
            raise ProviderError("edge-tts 未安装") from exc

    def status(self) -> ProviderReport:
        if self._report is not None:
            return self._report
        try:
            module = self._module()
            version = getattr(module, "__version__", "unknown")
            self._report = ProviderReport(self.name, True, f"edge-tts {version}")
        except Exception as exc:  # noqa: BLE001
            self._report = ProviderReport(self.name, False, f"{type(exc).__name__}: {exc}"[:160])
        return self._report

    def list_voices(self) -> list[Voice]:
        if self._voices is not None:
            return self._voices
        fallback = [
            Voice(v, _label(v), _gender(v)) for v in self.settings.voices
        ]
        try:
            module = self._module()
            raw = asyncio.run(module.list_voices())
            ko = [
                Voice(
                    id=item.get("ShortName", ""),
                    label=f"{item.get('LocalName', item.get('ShortName', ''))} · {item.get('Gender', '')}",
                    gender=str(item.get("Gender", "unknown")).lower(),
                )
                for item in raw
                if str(item.get("Locale", "")).lower() == "ko-kr"
                and "Neural" in str(item.get("ShortName", ""))
            ]
            self._voices = ko[:24] or fallback
        except Exception:  # noqa: BLE001 - 端点不通时用内置语音列表
            self._voices = fallback
        return self._voices

    def synthesize(self, text: str, voice: str, rate: float) -> TtsResult:
        module = self._module()
        percent = rate_to_percent(rate)
        communicate = module.Communicate(text, voice, rate=percent)

        audio = bytearray()
        try:
            for chunk in communicate.stream_sync():
                if chunk.get("type") == "audio" and chunk.get("data"):
                    audio.extend(chunk["data"])
        except Exception as exc:  # noqa: BLE001
            raise ProviderError(
                f"edge-tts 合成失败（{type(exc).__name__}）：微软端点可能不可用"
            ) from exc

        if len(audio) < 512:
            raise ProviderError("edge-tts 返回音频过短，疑似端点异常")
        return TtsResult(
            audio=bytes(audio),
            provider=self.name,
            content_type="audio/mpeg",
            voice=voice,
            rate=rate,
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
