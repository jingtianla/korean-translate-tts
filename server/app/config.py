"""环境变量驱动的运行时配置。

所有配置均有安全默认值：不配置任何环境变量也能启动，
此时翻译走在线免费 provider、发音由前端 Web Speech 兜底。
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def _float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


def _csv(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    # 服务
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "info"
    cors_origins: list[str] = field(default_factory=lambda: ["*"])

    # 翻译：按序尝试，第一个成功者返回
    translate_chain: list[str] = field(
        default_factory=lambda: ["argos", "libre", "free"]
    )
    source_lang: str = "zh"
    target_lang: str = "ko"
    max_text_length: int = 2000
    max_tts_length: int = 800
    request_timeout: float = 20.0

    # 在线翻译 provider
    libretranslate_url: str = "https://libretranslate.com/translate"
    libretranslate_api_key: str = ""
    mymemory_email: str = ""  # 可选，填了可提高匿名配额

    # 发音
    tts_provider: str = "edge"
    default_voice: str = "ko-KR-SunHiNeural"
    voices: list[str] = field(
        default_factory=lambda: [
            "ko-KR-SunHiNeural",
            "ko-KR-InJoonNeural",
            "ko-KR-HyunsuNeural",
            "ko-KR-SoonBokNeural",
        ]
    )
    rate_min: float = 0.5
    rate_max: float = 1.5
    rate_default: float = 1.0

    # 缓存
    cache_enabled: bool = True
    cache_max_entries: int = 256
    cache_ttl_seconds: int = 86400
    cache_max_bytes: int = 32 * 1024 * 1024  # 音频缓存上限，避免内存膨胀

    # 路径
    static_dir: str = ""
    argos_packages_dir: str = ""
    project_root: str = ""

    @classmethod
    def from_env(cls, project_root: Path | None = None) -> "Settings":
        root = str(project_root or Path(__file__).resolve().parents[2])
        pkg_dir = os.getenv("ARGOS_PACKAGES_DIR", "")
        if pkg_dir:
            os.environ.setdefault("ARGOS_PACKAGES_DIR", pkg_dir)

        chain = _csv("TRANSLATE_CHAIN", "argos,libre,free")
        allowed = {"argos", "libre", "free"}
        chain = [c for c in chain if c in allowed] or ["argos", "libre", "free"]

        return cls(
            host=os.getenv("APP_HOST", "0.0.0.0"),
            port=_int("APP_PORT", 8000),
            log_level=os.getenv("LOG_LEVEL", "info"),
            cors_origins=_csv("CORS_ORIGINS", "*"),
            translate_chain=chain,
            source_lang=os.getenv("SOURCE_LANG", "zh"),
            target_lang=os.getenv("TARGET_LANG", "ko"),
            max_text_length=_int("MAX_TEXT_LENGTH", 2000),
            max_tts_length=_int("MAX_TTS_LENGTH", 800),
            request_timeout=_float("REQUEST_TIMEOUT", 20.0),
            libretranslate_url=os.getenv(
                "LIBRETRANSLATE_URL", "https://libretranslate.com/translate"
            ),
            libretranslate_api_key=os.getenv("LIBRETRANSLATE_API_KEY", ""),
            mymemory_email=os.getenv("MYMEMORY_EMAIL", ""),
            tts_provider=os.getenv("TTS_PROVIDER", "edge"),
            default_voice=os.getenv("DEFAULT_VOICE", "ko-KR-SunHiNeural"),
            voices=_csv(
                "KO_VOICES",
                "ko-KR-SunHiNeural,ko-KR-InJoonNeural,"
                "ko-KR-HyunsuNeural,ko-KR-SoonBokNeural",
            ),
            rate_min=_float("RATE_MIN", 0.5),
            rate_max=_float("RATE_MAX", 1.5),
            rate_default=_float("RATE_DEFAULT", 1.0),
            cache_enabled=_bool("CACHE_ENABLED", True),
            cache_max_entries=_int("CACHE_MAX_ENTRIES", 256),
            cache_ttl_seconds=_int("CACHE_TTL_SECONDS", 86400),
            cache_max_bytes=_int("CACHE_MAX_BYTES", 32 * 1024 * 1024),
            static_dir=os.getenv("STATIC_DIR", str(Path(root) / "web" / "dist")),
            argos_packages_dir=pkg_dir,
            project_root=root,
        )

    def clamp_rate(self, rate: float) -> float:
        """把任意输入收敛到统一语速区间。"""
        if rate < self.rate_min:
            return self.rate_min
        if rate > self.rate_max:
            return self.rate_max
        return round(rate, 2)


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings.from_env()
    return _settings
