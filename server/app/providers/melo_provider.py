"""MeloTTS 离线发音 provider（MIT）— 默认关闭。

用途：在「完全离线、不允许出网」的场景替代 edge-tts。
代价：依赖 unidic / nltk / MeCab 类字典与数百 MB 韩语权重，与轻量约束冲突，
因此默认 MELOTTS_ENABLED=false，仅作为可插拔备选保留。

启用方式：
    pip install git+https://github.com/myshell-ai/MeloTTS.git
    python -m unidic download
    set MELOTTS_ENABLED=true
    set MELOTTS_MODEL_DIR=<MeloTTS-Korean 权重目录>
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from ..config import Settings
from .base import ProviderError, ProviderReport, TtsProvider, TtsResult, Voice


class MeloTtsProvider(TtsProvider):
    name = "melo"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._model = None
        self._report: ProviderReport | None = None

    @property
    def enabled(self) -> bool:
        return os.getenv("MELOTTS_ENABLED", "false").strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }

    def status(self) -> ProviderReport:
        if self._report is not None:
            return self._report
        if not self.enabled:
            self._report = ProviderReport(self.name, False, "默认关闭（MELOTTS_ENABLED=false）")
            return self._report
        try:
            from melo.api import TTS  # noqa: F401

            self._report = ProviderReport(self.name, True, "MeloTTS 离线韩语模型")
        except Exception as exc:  # noqa: BLE001
            self._report = ProviderReport(self.name, False, f"melotts 不可用: {type(exc).__name__}")
        return self._report

    def list_voices(self) -> list[Voice]:
        return [Voice("KR", "MeloTTS 韩语默认音色", "unknown")]

    def _load(self):
        if self._model is not None:
            return self._model
        from melo.api import TTS

        self._model = TTS(language="KR", device="cpu")
        return self._model

    def synthesize(self, text: str, voice: str, rate: float) -> TtsResult:
        if not self.enabled:
            raise ProviderError("MeloTTS 未启用")
        try:
            model = self._load()
            speaker_ids = model.hps.data.spk2id
            speaker = speaker_ids.get("KR", next(iter(speaker_ids.values())))
            with tempfile.TemporaryDirectory() as tmp:
                out = Path(tmp) / "speech.wav"
                # MeloTTS 的 speed 与统一倍速契约同为 0.5~2.0，直接透传
                model.tts_to_file(text, speaker, str(out), speed=rate)
                audio = out.read_bytes()
        except Exception as exc:  # noqa: BLE001
            raise ProviderError(f"MeloTTS 合成失败：{type(exc).__name__}") from exc
        if not audio:
            raise ProviderError("MeloTTS 返回空音频")
        return TtsResult(
            audio=audio,
            provider=self.name,
            content_type="audio/wav",
            voice=voice,
            rate=rate,
        )
