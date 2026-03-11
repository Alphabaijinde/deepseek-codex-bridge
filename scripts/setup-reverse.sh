#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_PATH="${ROOT_DIR}/reverse-api.config.json"
ENV_PATH="${ROOT_DIR}/.env.reverse"

generate_key() {
  python3 - <<'PY'
import secrets
print("dslocal-" + secrets.token_urlsafe(24))
PY
}

LOCAL_KEY="${REVERSE_API_KEY:-$(generate_key)}"
API_PORT="${REVERSE_API_PORT:-5001}"
MODEL_NAME="${REVERSE_API_MODEL:-deepseek-reasoner}"

cat >"${CONFIG_PATH}" <<EOF
{
  "keys": [
    "${LOCAL_KEY}"
  ],
  "accounts": [
    {
      "email": "your-deepseek-email@example.com",
      "password": "your-deepseek-password",
      "token": ""
    }
  ]
}
EOF

cat >"${ENV_PATH}" <<EOF
export USE_MODE=reverse
export REVERSE_API_BASE_URL="http://127.0.0.1:${API_PORT}/v1"
export REVERSE_API_KEY="${LOCAL_KEY}"
export REVERSE_API_MODEL="${MODEL_NAME}"
EOF

printf 'Created %s\n' "${CONFIG_PATH}"
printf 'Created %s\n' "${ENV_PATH}"
printf '\nNext steps:\n'
printf '1. Edit %s and fill in your DeepSeek account credentials.\n' "${CONFIG_PATH}"
printf '2. Start deepseek2api with that config.\n'
printf '3. Run: source %s && echo "你的问题" | npm run ask\n' "${ENV_PATH}"
