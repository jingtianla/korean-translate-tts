"""LibreTranslate HTTP provider（AGPL-3.0 服务边界，仅对接不内嵌）。

只通过 HTTP 调用，不把其源码并入本工程，避免 AGPL 网络服务条款的传染风险。
默认指向公共实例（可能限流/需 key）；生产建议自托管并配置 LIBRETRANSLATE_URL。
"""

from __future__ import annotations

import httpx

from ..config import Settings
from ..schemas import split_sentences
from .base import ProviderError, ProviderReport, TranslationResult, TranslatorProvider


class LibreTranslateProvider(TranslatorProvider):
    name = "libre"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def status(self) -> ProviderReport:
        url = self.settings.libretranslate_url.strip()
        if not url:
            return ProviderReport(self.name, False, "未配置 LIBRETRANSLATE_URL")
        return ProviderReport(self.name, True, f"HTTP → {url.split('/')[2]}")

    def translate(self, text: str, source: str, target: str) -> TranslationResult:
        url = self.settings.libretranslate_url.strip()
        if not url:
            raise ProviderError("未配置 LibreTranslate 地址")

        segments = split_sentences(text, limit=450)
        outputs: list[str] = []
        timeout = min(self.settings.request_timeout, 15.0)
        with httpx.Client(timeout=timeout) as client:
            for segment in segments:
                payload = {
                    "q": segment,
                    "source": _lang(source),
                    "target": _lang(target),
                    "format": "text",
                }
                if self.settings.libretranslate_api_key:
                    payload["api_key"] = self.settings.libretranslate_api_key
                response = client.post(url, data=payload)
                if response.status_code != 200:
                    raise ProviderError(f"LibreTranslate HTTP {response.status_code}")
                translated = response.json().get("translatedText", "").strip()
                if not translated:
                    raise ProviderError("LibreTranslate 返回空译文")
                outputs.append(translated)
        return TranslationResult(
            text=" ".join(outputs),
            provider=self.name,
            via_pivot=False,
            segments=outputs,
        )


def _lang(code: str) -> str:
    return {"zh": "zh", "ko": "ko", "en": "en"}.get(code, code)
