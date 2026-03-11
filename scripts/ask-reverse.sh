#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_PATH="${ROOT_DIR}/.env.reverse"

if [[ ! -f "${ENV_PATH}" ]]; then
  printf 'Missing %s. Run scripts/setup-reverse.sh first.\n' "${ENV_PATH}" >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  printf 'Usage: scripts/ask-reverse.sh "your prompt"\n' >&2
  exit 1
fi

source "${ENV_PATH}"
printf '%s' "$1" | npm run ask
