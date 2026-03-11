# deepseek-codex-bridge

Local bridge: connect DeepSeek/OpenAI-compatible reasoning outputs to Codex CLI.

## Quick Start (with Docker)

```bash
# 1. Pull and run deepseek2api container
docker run -d --name deepseek2api \
  -p 5001:5001 \
  -v $(pwd)/reverse-api.config.json:/app/config.json \
  ghcr.io/iidamie/deepseek2api:latest

# 2. Get your DeepSeek token and save to config
#    (see "Get Your DeepSeek Token" below)

# 3. Restart container with your token
docker restart deepseek2api

# 4. Use the bridge
cd /home/user/work/workspace/deepseek-codex-bridge
source .env.reverse
echo "your question" | npm run ask
```

## Get Your DeepSeek Token

1. Open https://chat.deepseek.com in browser
2. Login with WeChat
3. Press F12 → Application → Local Storage → chat.deepseek.com
4. Copy `userToken` value
5. Save to `reverse-api.config.json`:

```json
{
  "keys": ["your-local-api-key"],
  "accounts": [{"token": "your-userToken-here"}]
}
```

6. Update `.env.reverse`:
```bash
export USE_MODE=reverse
export REVERSE_API_BASE_URL="http://127.0.0.1:5001/v1"
export REVERSE_API_KEY="your-userToken-here"
export REVERSE_API_MODEL="deepseek-reasoner"
```

## Token Refresh (when expired)

When DeepSeek returns "invalid token", run:

```bash
cd /home/user/work/workspace/deepseek-codex-bridge
npm run refresh-token
```

Then scan WeChat QR code to get new token.

---

## Original README

```bash
cd /home/user/work/workspace/deepseek-codex-bridge

# 1. Start local reverse API (recommended)
# 2. Ask through DeepSeek first, then pass reasoning/output to Codex
echo "your question" | npm run ask
```

## Mode Selection

| Mode | Description | Command |
|------|-------------|---------|
| `reverse` (default) | Use local `deepseek2api` compatible endpoint | `USE_MODE=reverse npm run ask` |
| `api` | Use API providers (OpenRouter, OpenAI, Anthropic) | `USE_MODE=api npm run ask` |
| `web` | Use DeepSeek web UI via Playwright | `USE_MODE=web npm run ask` |

## Recommended Setup: Local Reverse API

Run a local DeepSeek reverse API such as `iidamie/deepseek2api`, then point the bridge to it:

```bash
npm run setup-reverse
# edit reverse-api.config.json and fill your DeepSeek account/password
npm run start-reverse-api
source .env.reverse
echo "用Python写一个快速排序" | npm run ask
```

`REVERSE_API_KEY` is not an official DeepSeek key. It is a local bearer token that you define yourself in `reverse-api.config.json`, and the helper script generates one for you automatically.

### Helper Scripts

```bash
# generate local key + config template
npm run setup-reverse

# start local deepseek2api container
npm run start-reverse-api

# ask through reverse mode after .env.reverse exists
./scripts/ask-reverse.sh "用Python写一个快速排序"
```

Generated files:
- `reverse-api.config.json`: template for `deepseek2api` accounts and local keys
- `.env.reverse`: environment variables for this bridge

The bridge reads both:
- `choices[0].message.reasoning_content`
- `choices[0].message.content`

and forwards them to Codex CLI as extra context.

## Provider Configuration

### OpenRouter (Recommended - Free Models Available)

```bash
export API_PROVIDER=openrouter
export OPENROUTER_API_KEY="your-openrouter-key"
export API_ROLE=reasoning  # reasoning, fast, free
```

**Free Models via OpenRouter:**
- `openrouter/free` - Auto-selects best free model
- `deepseek/deepseek-v3.2` - Fast, cheap
- `deepseek/deepseek-r1` - Strong reasoning

### OpenAI

```bash
export API_PROVIDER=openai
export OPENAI_API_KEY="your-openai-key"
export API_ROLE=fast  # reasoning (o1), fast (gpt-4o-mini)
```

### Anthropic

```bash
export API_PROVIDER=anthropic
export ANTHROPIC_API_KEY="your-anthropic-key"
export API_ROLE=fast  # reasoning (claude-3-opus), fast (claude-3-haiku)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_MODE` | `reverse` | Mode: `reverse`, `api`, or `web` |
| `API_PROVIDER` | `openrouter` | Provider: `openrouter`, `openai`, `anthropic` |
| `API_ROLE` | `fast` | Model tier: `reasoning`, `fast`, `free` |
| `API_MODEL` | (auto) | Explicit model ID (overrides role) |
| `INCLUDE_REASONING` | `true` | Include thinking in output |
| `REVERSE_API_BASE_URL` | `http://127.0.0.1:5001/v1` | Local reverse API base URL |
| `REVERSE_API_KEY` | `local-key` | Reverse API bearer token |
| `REVERSE_API_MODEL` | `deepseek-reasoner` | Reverse API model |
| `CODEX_CMD` | `codex` | Codex CLI command |
| `CODEX_ARGS` | (none) | Codex CLI arguments |

## Usage Examples

```bash
# Use local reverse API with DeepSeek reasoning
export USE_MODE=reverse
export REVERSE_API_BASE_URL="http://127.0.0.1:5001/v1"
export REVERSE_API_KEY="your-local-key"
export REVERSE_API_MODEL="deepseek-reasoner"
echo "Write a sorting algorithm" | npm run ask

# Use free OpenRouter model
export API_PROVIDER=openrouter
export OPENROUTER_API_KEY="sk-or-v1-xxx"
export API_ROLE=free
echo "Explain quantum computing" | npm run ask

# Use DeepSeek R1 reasoning model
export API_PROVIDER=openrouter
export OPENROUTER_API_KEY="sk-or-v1-xxx"
export API_ROLE=reasoning
echo "Write a sorting algorithm" | npm run ask

# Use OpenAI o1 for reasoning
export API_PROVIDER=openai
export OPENAI_API_KEY="sk-xxx"
export API_ROLE=reasoning
echo "Solve this math problem" | npm run ask

# Use web UI (requires saved session)
export USE_MODE=web
export DEEPSEEK_INPUT_SELECTOR="textarea"
export DEEPSEEK_ASSISTANT_SELECTOR=".assistant-message"
echo "Your question" | npm run ask
```

## Web Mode Setup

For `USE_MODE=web`, you need to:

1. Run `npm run save-session` once
2. Set DeepSeek selectors (from Playwright codegen):
   ```bash
   export DEEPSEEK_INPUT_SELECTOR="textarea"
   export DEEPSEEK_ASSISTANT_SELECTOR=".assistant-message"
   export DEEPSEEK_SEND_SELECTOR="button.send"
   export DEEPSEEK_THINKING_SELECTOR=".thinking"
   ```
