#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd -P)"
cd "$ROOT"
PORT="${CLAUDE_TODOS_CLIENT_PORT:-8766}"
SERVER_URL="${CLAUDE_TODOS_SERVER_URL:-http://127.0.0.1:8765}"
NO_OPEN=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) [[ $# -ge 2 ]] || { echo '❌ --port requires a value' >&2; exit 64; }; PORT="$2"; shift 2 ;;
    --server-url) [[ $# -ge 2 ]] || { echo '❌ --server-url requires a URL' >&2; exit 64; }; SERVER_URL="$2"; shift 2 ;;
    --no-open) NO_OPEN=1; shift ;;
    -h|--help) exec python3 client/serve.py --help ;;
    *) echo "❌ Unknown argument: $1" >&2; echo 'Usage: ./start-client.sh [--port N] [--server-url URL] [--no-open]' >&2; exit 64 ;;
  esac
done
ARGS=(--port "$PORT" --server-url "$SERVER_URL")
[[ "$NO_OPEN" -eq 1 ]] && ARGS+=(--no-open)
exec python3 client/serve.py "${ARGS[@]}"
