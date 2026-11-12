#!/usr/bin/env bash
# 健康检查入口：校验 HTTP 状态、服务状态字段、版本与首页可达性。
# 用法: ./deploy/healthcheck.sh [base_url] [expected_version]
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8000}"
EXPECTED_VERSION="${2:-}"
MAX_TRIES="${MAX_TRIES:-20}"

echo "[healthcheck] target=${BASE_URL}"
for i in $(seq 1 "${MAX_TRIES}"); do
  if curl -fsS --max-time 5 "${BASE_URL}/api/health" -o /tmp/ko-health.json 2>/dev/null; then
    break
  fi
  echo "[healthcheck] attempt ${i}/${MAX_TRIES}: not ready"
  sleep 2
done

if [[ ! -s /tmp/ko-health.json ]]; then
  echo "[healthcheck] FAIL: /api/health unreachable" >&2
  exit 1
fi

python3 - "${EXPECTED_VERSION}" <<'PY'
import json
import sys
from pathlib import Path

expected = sys.argv[1] if len(sys.argv) > 1 else ""
data = json.loads(Path("/tmp/ko-health.json").read_text(encoding="utf-8"))
status = data.get("status")
version = data.get("version")
if status not in ("ok", "degraded"):
    raise SystemExit(f"[healthcheck] FAIL: status={status!r}")
if not version:
    raise SystemExit("[healthcheck] FAIL: missing version")
if expected and expected not in (version, ""):
    raise SystemExit(f"[healthcheck] FAIL: version mismatch, expected {expected}, got {version}")
print(f"[healthcheck] PASS: status={status} version={version}")
print(f"[healthcheck] translate={[p['name'] for p in data.get('translateChain', []) if p.get('available')]}")
print(f"[healthcheck] tts_ready={data.get('tts', {}).get('available')}")
PY

HOME_CODE=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 "${BASE_URL}/")
if [[ "${HOME_CODE}" != "200" ]]; then
  echo "[healthcheck] FAIL: homepage HTTP ${HOME_CODE}" >&2
  exit 1
fi
echo "[healthcheck] PASS: homepage HTTP 200"
