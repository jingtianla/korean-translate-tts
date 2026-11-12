"""Provider 统一契约与降级链。

设计目标：第三方引擎（Argos / LibreTranslate / MyMemory / edge-tts / MeloTTS）
能力、参数、许可证各不相同，这里收敛成两个接口 + 一条降级链，
使路由层完全不感知具体引擎，也避免对单一项目的硬绑定。

统一语速契约为 0.5 ~ 1.5 倍速；各 provider 自行映射到自己的参数空间：
  - edge-tts : "+0%" / "-50%" 百分比字符串（正则 ^[+-]\\d+%$）
  - MeloTTS  : speed=0.5 ~ 1.5
  - Web Speech: rate=0.5 ~ 1.5（前端）
"""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

logger = logging.getLogger("korean.providers")


class ProviderError(RuntimeError):
    """上游不可用或返回异常，用于触发降级。"""


@dataclass
class ProviderReport:
    name: str
    available: bool
    detail: str = ""


@dataclass
class Voice:
    id: str
    label: str
    gender: str = "unknown"


@dataclass
class TranslationResult:
    text: str
    provider: str
    via_pivot: bool = False
    warning: str | None = None
    segments: list[str] = field(default_factory=list)


@dataclass
class TtsResult:
    audio: bytes
    provider: str
    content_type: str = "audio/mpeg"
    voice: str = ""
    rate: float = 1.0


class TranslatorProvider(ABC):
    name: str = "base"

    @abstractmethod
    def status(self) -> ProviderReport:
        """轻量可用性探测，不得触发网络请求或模型加载。"""

    @abstractmethod
    def translate(self, text: str, source: str, target: str) -> TranslationResult:
        """同步翻译；失败抛 ProviderError 以便降级。"""


class TtsProvider(ABC):
    name: str = "base"

    @abstractmethod
    def status(self) -> ProviderReport:
        """轻量可用性探测。"""

    def list_voices(self) -> list[Voice]:
        return []

    @abstractmethod
    def synthesize(self, text: str, voice: str, rate: float) -> TtsResult:
        """同步合成；失败抛 ProviderError。"""


def rate_to_percent(rate: float) -> str:
    """统一倍速 → edge-tts 百分比字符串，必须带显式符号。"""
    pct = int(round((rate - 1.0) * 100))
    return f"{pct:+d}%"


class TranslationChain:
    """按配置顺序尝试翻译 provider，第一个成功即返回。

    日志记录绝不包含用户原文（PII），只记 provider 名、耗时与错误类型。
    """

    def __init__(self, providers: list[TranslatorProvider]) -> None:
        self.providers = providers

    def reports(self) -> list[ProviderReport]:
        return [p.status() for p in self.providers]

    def translate(self, text: str, source: str, target: str) -> tuple[TranslationResult, bool]:
        errors: list[str] = []
        for index, provider in enumerate(self.providers):
            report = provider.status()
            if not report.available:
                errors.append(f"{provider.name}: 未就绪 ({report.detail})")
                continue
            started = time.monotonic()
            try:
                result = provider.translate(text, source, target)
                if not result.text.strip():
                    raise ProviderError("empty translation")
                cost = int((time.monotonic() - started) * 1000)
                logger.info("translate ok provider=%s cost=%dms", provider.name, cost)
                return result, index > 0
            except Exception as exc:  # noqa: BLE001 - 降级链必须兜住所有上游异常
                cost = int((time.monotonic() - started) * 1000)
                logger.warning(
                    "translate failed provider=%s cost=%dms error=%s",
                    provider.name,
                    cost,
                    type(exc).__name__,
                )
                errors.append(f"{provider.name}: {type(exc).__name__}")
        raise ProviderError("所有翻译引擎均不可用：" + "；".join(errors))


class TtsChain:
    """按配置顺序尝试发音 provider。"""

    def __init__(self, providers: list[TtsProvider]) -> None:
        self.providers = providers

    def reports(self) -> list[ProviderReport]:
        return [p.status() for p in self.providers]

    def list_voices(self) -> list[Voice]:
        for provider in self.providers:
            if provider.status().available:
                voices = provider.list_voices()
                if voices:
                    return voices
        return []

    def synthesize(self, text: str, voice: str, rate: float) -> TtsResult:
        errors: list[str] = []
        for provider in self.providers:
            report = provider.status()
            if not report.available:
                errors.append(f"{provider.name}: 未就绪 ({report.detail})")
                continue
            started = time.monotonic()
            try:
                result = provider.synthesize(text, voice, rate)
                if not result.audio:
                    raise ProviderError("empty audio")
                cost = int((time.monotonic() - started) * 1000)
                logger.info("tts ok provider=%s cost=%dms bytes=%d", provider.name, cost, len(result.audio))
                return result
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "tts failed provider=%s cost=%dms error=%s",
                    provider.name,
                    int((time.monotonic() - started) * 1000),
                    type(exc).__name__,
                )
                errors.append(f"{provider.name}: {type(exc).__name__}")
        raise ProviderError("所有服务端发音引擎均不可用：" + "；".join(errors))
