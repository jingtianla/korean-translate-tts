"""Argos Translate 离线翻译 provider（MIT，pip 独立依赖）。

关键事实（已核验 vendor/argos-translate 源码）：
- `translate.get_installed_languages()` 带 lru_cache，并会自动把
  zh→en + en→ko 合成为 CompositeTranslation（pivot 两跳）。
- `get_translation_from_codes("zh","ko")` 无路径时返回 None，
  直接 .translate() 会抛 AttributeError，这里显式判空并抛 ProviderError 触发降级。
- 语言包通过 `package.install_from_path()` 离线安装，装完需 cache_clear()。
"""

from __future__ import annotations

from ..config import Settings
from ..schemas import split_sentences
from .base import ProviderError, ProviderReport, TranslationResult, TranslatorProvider


class ArgosProvider(TranslatorProvider):
    name = "argos"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._report: ProviderReport | None = None

    def _import(self):
        try:
            import argostranslate.translate as at

            return at
        except ImportError as exc:
            raise ProviderError("argostranslate 未安装") from exc

    def status(self) -> ProviderReport:
        if self._report is not None:
            return self._report
        try:
            at = self._import()
            languages = at.get_installed_languages()
            codes = {lang.code for lang in languages}
            if self.settings.source_lang not in codes or self.settings.target_lang not in codes:
                self._report = ProviderReport(
                    self.name,
                    False,
                    "缺少语言包，请运行 server/scripts/setup_argos.py",
                )
                return self._report
            path = at.get_translation_from_codes(
                self.settings.source_lang, self.settings.target_lang
            )
            if path is None:
                self._report = ProviderReport(
                    self.name, False, "语言包未连通 zh→ko（需 zh→en + en→ko）"
                )
                return self._report
            via_pivot = type(path).__name__ == "CompositeTranslation"
            self._report = ProviderReport(
                self.name,
                True,
                "离线可用；经英语中转" if via_pivot else "离线可用；直连",
            )
        except Exception as exc:  # noqa: BLE001
            self._report = ProviderReport(self.name, False, f"{type(exc).__name__}: {exc}"[:160])
        return self._report

    def refresh(self) -> None:
        """安装新语言包后清缓存。"""
        self._report = None
        try:
            at = self._import()
            at.get_installed_languages.cache_clear()
        except Exception:  # noqa: BLE001
            pass

    def translate(self, text: str, source: str, target: str) -> TranslationResult:
        at = self._import()
        translation = at.get_translation_from_codes(source, target)
        if translation is None:
            raise ProviderError(f"未找到 {source}→{target} 翻译路径")
        result = translation.translate(text)
        if not result or not str(result).strip():
            raise ProviderError("Argos 返回空译文")
        via_pivot = type(translation).__name__ == "CompositeTranslation"
        return TranslationResult(
            text=str(result).strip(),
            provider=self.name,
            via_pivot=via_pivot,
            segments=split_sentences(text),
        )
