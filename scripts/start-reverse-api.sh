#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_PATH="${ROOT_DIR}/reverse-api.config.json"
PORT="${REVERSE_API_PORT:-5001}"
CONTAINER_NAME="${REVERSE_API_CONTAINER:-deepseek2api-local}"
IMAGE="${REVERSE_API_IMAGE:-ghcr.io/iidamie/deepseek2api:latest}"

if [[ ! -f "${CONFIG_PATH}" ]]; then
  printf 'Missing %s. Run scripts/setup-reverse.sh first.\n' "${CONFIG_PATH}" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  printf 'Docker is required for this script. Install Docker or run deepseek2api another way.\n' >&2
  exit 1
fi

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${PORT}:5001" \
  -v "${CONFIG_PATH}:/app/config.json" \
  "${IMAGE}" >/dev/null

printf 'Started %s on http://127.0.0.1:%s\n' "${CONTAINER_NAME}" "${PORT}"
printf 'View logs: docker logs -f %s\n' "${CONTAINER_NAME}"
