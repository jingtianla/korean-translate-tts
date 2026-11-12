"""应用运行时容器：集中持有配置、缓存与 provider 链。

挂载在 app.state.runtime，供路由层通过 Request 读取，
避免模块级全局可变状态，也方便测试时替换。
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

from .cache import LRUCache
from .config import Settings
from .providers.base import TranslationChain, TtsChain


@dataclass
class Runtime:
    settings: Settings
    text_cache: LRUCache[Any]
    audio_cache: LRUCache[bytes]
    translators: TranslationChain
    tts: TtsChain
    started_at: float = field(default_factory=time.monotonic)
    warnings: list[str] = field(default_factory=list)

    @property
    def uptime_seconds(self) -> int:
        return int(time.monotonic() - self.started_at)
