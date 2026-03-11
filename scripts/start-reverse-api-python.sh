#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_PATH="${ROOT_DIR}/reverse-api.config.json"
PORT="${REVERSE_API_PORT:-5001}"

if [[ ! -f "${CONFIG_PATH}" ]]; then
  printf 'Missing %s. Run scripts/setup-reverse.sh first.\n' "${CONFIG_PATH}" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  printf 'Python 3 is required.\n' >&2
  exit 1
fi

DEEPSEEK_API_DIR="${ROOT_DIR}/deepseek2api"
if [[ ! -d "${DEEPSEEK_API_DIR}" ]]; then
  git clone --quiet https://github.com/iidamie/deepseek2api.git "${DEEPSEEK_API_DIR}"
fi

pip3 install --user --quiet flask flask_cors requests PyJWT httpx selenium webdriver-manager pillow 2>/dev/null || pip3 install --quiet flask flask_cors requests PyJWT httpx selenium webdriver-manager pillow

cd "${DEEPSEEK_API_DIR}"
nohup python3 app.py --port "${PORT}" >"${ROOT_DIR}/deepseek2api.log" 2>&1 &
PID=$!

sleep 5

if kill -0 $PID 2>/dev/null; then
  printf 'Started deepseek2api on http://127.0.0.1:%s (PID: %s)\n' "${PORT}" "$PID"
  printf 'Logs: %s\n' "${ROOT_DIR}/deepseek2api.log"
else
  printf 'Failed to start. Check logs: %s\n' "${ROOT_DIR}/deepseek2api.log" >&2
  cat "${ROOT_DIR}/deepseek2api.log" >&2
  exit 1
fi
