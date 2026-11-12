#!/usr/bin/env bash
# 按同一镜像 Digest 部署。用法: ./deploy/deploy.sh ghcr.io/<owner>/<repo>@sha256:<digest>
# 不重新构建镜像；测试、验收、生产必须使用完全相同的 digest-pinned ref。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

REF="${1:-}"
if [[ -z "${REF}" ]]; then
  echo "usage: $0 <image@sha256:digest>" >&2
  exit 2
fi
if [[ ! "${REF}" =~ @sha256:[0-9a-f]{64}$ ]]; then
  echo "[deploy] FAIL: ref must be digest-pinned (image@sha256:64hex), got: ${REF}" >&2
  exit 2
fi

CURRENT_FILE="${ROOT}/deploy/.env.deploy"
PREVIOUS_FILE="${ROOT}/deploy/.previous_image_ref"

if [[ -f "${CURRENT_FILE}" ]]; then
  PREVIOUS=$(grep -E '^IMAGE_REF=' "${CURRENT_FILE}" | cut -d= -f2- || true)
  if [[ -n "${PREVIOUS}" && "${PREVIOUS}" != "${REF}" ]]; then
    printf '%s\n' "${PREVIOUS}" > "${PREVIOUS_FILE}"
    echo "[deploy] previous ref recorded for rollback"
  fi
fi

printf 'IMAGE_REF=%s\n' "${REF}" > "${CURRENT_FILE}"
echo "[deploy] pulling ${REF}"
docker pull "${REF}"

echo "[deploy] starting containers"
docker compose --env-file "${CURRENT_FILE}" -f deploy/docker-compose.prod.yml up -d --no-build

"${ROOT}/deploy/healthcheck.sh" "${BASE_URL:-http://127.0.0.1:8000}"

echo "[deploy] PASS: deployed ${REF}"
