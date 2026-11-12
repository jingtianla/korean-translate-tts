"""线程安全 LRU 缓存：译文与音频分别缓存，带 TTL 与字节上限。

不引入 Redis / 数据库，符合轻量约束。音频按字节数统计，
避免大量长文本合成把内存撑爆。
"""

from __future__ import annotations

import threading
import time
from collections import OrderedDict
from typing import Generic, TypeVar

T = TypeVar("T")


class LRUCache(Generic[T]):
    def __init__(
        self,
        max_entries: int = 256,
        ttl_seconds: int = 86400,
        max_bytes: int = 0,
        enabled: bool = True,
    ) -> None:
        self.max_entries = max(1, max_entries)
        self.ttl = ttl_seconds
        self.max_bytes = max_bytes
        self.enabled = enabled
        self._data: OrderedDict[str, tuple[float, T, int]] = OrderedDict()
        self._lock = threading.RLock()
        self._bytes = 0
        self.hits = 0
        self.misses = 0

    @staticmethod
    def _size(value: T) -> int:
        if isinstance(value, (bytes, bytearray)):
            return len(value)
        if isinstance(value, str):
            return len(value.encode("utf-8"))
        return 0

    def get(self, key: str) -> T | None:
        if not self.enabled:
            return None
        with self._lock:
            item = self._data.get(key)
            if item is None:
                self.misses += 1
                return None
            created, value, _ = item
            if self.ttl > 0 and time.monotonic() - created > self.ttl:
                self._evict(key)
                self.misses += 1
                return None
            self._data.move_to_end(key)
            self.hits += 1
            return value

    def set(self, key: str, value: T) -> None:
        if not self.enabled:
            return
        size = self._size(value)
        if self.max_bytes and size > self.max_bytes:
            return  # 单个对象过大，直接不缓存
        with self._lock:
            if key in self._data:
                self._evict(key)
            self._data[key] = (time.monotonic(), value, size)
            self._bytes += size
            self._trim()

    def _evict(self, key: str) -> None:
        item = self._data.pop(key, None)
        if item is not None:
            self._bytes -= item[2]

    def _trim(self) -> None:
        while len(self._data) > self.max_entries:
            oldest = next(iter(self._data))
            self._evict(oldest)
        if self.max_bytes:
            while self._bytes > self.max_bytes and self._data:
                oldest = next(iter(self._data))
                self._evict(oldest)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()
            self._bytes = 0

    def stats(self) -> dict[str, int | bool]:
        with self._lock:
            return {
                "enabled": self.enabled,
                "entries": len(self._data),
                "bytes": self._bytes,
                "hits": self.hits,
                "misses": self.misses,
            }


def cache_key(*parts: object) -> str:
    """稳定拼接缓存键。"""
    return "|".join(str(p) for p in parts)
