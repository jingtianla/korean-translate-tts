#!/usr/bin/env bash
# 安全回滚：切回上一次已验证的 Digest 引用，并重新执行健康检查。
# 不做数据删除、不强制重建镜像；若无历史版本则明确停止，交由人工决策。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

PREVIOUS_FILE="${ROOT}/deploy/.previous_image_ref"
if [[ ! -s "${PREVIOUS_FILE}" ]]; then
  echo "[rollback] STOP: no previous digest recorded; manual decision required" >&2
  exit 3
fi

REF=$(head -n1 "${PREVIOUS_FILE}")
if [[ ! "${REF}" =~ @sha256:[0-9a-f]{64}$ ]]; then
  echo "[rollback] STOP: recorded ref is not a valid digest" >&2
  exit 3
fi

echo "[rollback] reverting to ${REF}"
printf 'IMAGE_REF=%s\n' "${REF}" > "${ROOT}/deploy/.env.deploy"
docker pull "${REF}"
docker compose --env-file "${ROOT}/deploy/.env.deploy" -f deploy/docker-compose.prod.yml up -d --no-build
"${ROOT}/deploy/healthcheck.sh" "${BASE_URL:-http://127.0.0.1:8000}"
echo "[rollback] PASS: reverted to ${REF}"
