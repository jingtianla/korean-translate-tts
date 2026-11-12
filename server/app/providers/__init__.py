"""Provider 工厂。

采用惰性 import：任何可选引擎（argostranslate / edge_tts / melotts）未安装时，
只把对应 provider 标为不可用，不影响服务启动与其余降级链。
这样 `pip install -r requirements.txt` 的最小依赖也能跑起整套 API。
"""

from __future__ import annotations

import importlib
import logging
from typing import Any

from ..config import Settings
from .base import TranslationChain, TtsChain, TranslatorProvider, TtsProvider

logger = logging.getLogger("korean.factory")

_TRANSLATOR_MODULES = {
    "argos": ("argos_provider", "ArgosProvider"),
    "libre": ("libretranslate_provider", "LibreTranslateProvider"),
    "free": ("free_provider", "FreeTranslateProvider"),
}

_TTS_MODULES = {
    "edge": ("edge_tts_provider", "EdgeTtsProvider"),
    "melo": ("melo_provider", "MeloTtsProvider"),
}


def _load(module_name: str, class_name: str, settings: Settings) -> Any | None:
    try:
        module = importlib.import_module(f"{__name__}.{module_name}")
        cls = getattr(module, class_name)
        return cls(settings)
    except ImportError as exc:
        logger.info("optional provider skipped module=%s reason=%s", module_name, exc.name)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("provider init failed module=%s error=%s", module_name, type(exc).__name__)
        return None


def build_translator_chain(settings: Settings) -> TranslationChain:
    providers: list[TranslatorProvider] = []
    for key in settings.translate_chain:
        if key not in _TRANSLATOR_MODULES:
            continue
        module_name, class_name = _TRANSLATOR_MODULES[key]
        instance = _load(module_name, class_name, settings)
        if instance is not None:
            providers.append(instance)
    if not providers:
        logger.error("no translator provider could be constructed")
    return TranslationChain(providers)


def build_tts_chain(settings: Settings) -> TtsChain:
    order = [settings.tts_provider] + [
        key for key in _TTS_MODULES if key != settings.tts_provider
    ]
    providers: list[TtsProvider] = []
    for key in order:
        if key not in _TTS_MODULES:
            continue
        module_name, class_name = _TTS_MODULES[key]
        instance = _load(module_name, class_name, settings)
        if instance is not None:
            providers.append(instance)
    return TtsChain(providers)
