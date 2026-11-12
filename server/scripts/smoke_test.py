"""后端接口冒烟测试。

结果同时打印到控制台并写入 server/scripts/smoke_result.json，
避免 Windows 控制台 GBK 编码导致韩文/中文输出中断。

用法： python server/scripts/smoke_test.py [base_url]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
OUT = Path(__file__).with_name("smoke_result.json")

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
except (AttributeError, ValueError):
    pass


def main() -> int:
    report: dict[str, object] = {}
    with httpx.Client(timeout=60.0, trust_env=False) as client:
        checks = [
            ("health", lambda: client.get(f"{BASE}/api/health")),
            ("voices", lambda: client.get(f"{BASE}/api/voices")),
            (
                "translate",
                lambda: client.post(
                    f"{BASE}/api/translate",
                    json={
                        "text": "你好，很高兴认识你。今天天气真好。",
                        "source": "zh",
                        "target": "ko",
                    },
                ),
            ),
            (
                "tts",
                lambda: client.post(
                    f"{BASE}/api/tts",
                    json={
                        "text": "안녕하세요",
                        "voice": "ko-KR-SunHiNeural",
                        "rate": 0.8,
                    },
                ),
            ),
        ]
        for name, call in checks:
            try:
                response = call()
                try:
                    body = response.json()
                except ValueError:
                    body = response.text[:300]
                if isinstance(body, str) and len(body) > 50 and name == "tts":
                    body = "(audio or plain text)"
                report[name] = {"status": response.status_code, "body": body}
                print(f"{name}: status={response.status_code}")
            except Exception as exc:  # noqa: BLE001
                report[name] = {"error": f"{type(exc).__name__}: {exc}"}
                print(f"{name}: ERROR {type(exc).__name__}")

    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"written: {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
