"""零配置兜底翻译 provider：MyMemory 匿名免费 API。

MyMemory 提供无需密钥的匿名额度（可配 MYMEMORY_EMAIL 提升配额），
支持 zh-CN|ko-KR 语言对。作为「离线语言包未安装 / 公共 LibreTranslate 不可用」
时的最后一道保障，让平台零配置即可出译文。

注意：这是第三方在线服务，按条款有调用配额且译文质量不稳定，
仅作兜底；正式使用建议安装 Argos 离线包或自托管 LibreTranslate。
"""

from __future__ import annotations

import html

import httpx

from ..config import Settings
from ..schemas import split_sentences
from .base import ProviderError, ProviderReport, TranslationResult, TranslatorProvider

_ENDPOINT = "https://api.mymemory.translated.net/get"

_LANG = {
    "zh": "zh-CN",
    "ko": "ko-KR",
    "en": "en-US",
    "ja": "ja-JP",
}


class FreeTranslateProvider(TranslatorProvider):
    name = "free"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def status(self) -> ProviderReport:
        return ProviderReport(self.name, True, "MyMemory 匿名免费接口（有配额）")

    def translate(self, text: str, source: str, target: str) -> TranslationResult:
        langpair = f"{_LANG.get(source, source)}|{_LANG.get(target, target)}"
        segments = split_sentences(text, limit=420)
        outputs: list[str] = []
        timeout = min(self.settings.request_timeout, 15.0)

        with httpx.Client(timeout=timeout) as client:
            for segment in segments:
                params = {"q": segment, "langpair": langpair}
                if self.settings.mymemory_email:
                    params["de"] = self.settings.mymemory_email
                response = client.get(_ENDPOINT, params=params)
                if response.status_code != 200:
                    raise ProviderError(f"MyMemory HTTP {response.status_code}")
                data = response.json()
                if data.get("responseStatus") not in (200, "200", None):
                    raise ProviderError("MyMemory 配额或参数错误")
                translated = html.unescape(
                    (data.get("responseData") or {}).get("translatedText", "")
                ).strip()
                if not translated or "MYMEMORY WARNING" in translated:
                    raise ProviderError("MyMemory 返回空译文或配额告警")
                outputs.append(translated)

        return TranslationResult(
            text=" ".join(outputs),
            provider=self.name,
            via_pivot=False,
            warning="使用在线免费接口，译文仅供参考且受配额限制",
            segments=outputs,
        )
