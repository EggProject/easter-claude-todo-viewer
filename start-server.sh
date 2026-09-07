#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd -P)"
cd "$ROOT"
PORT="${CLAUDE_TODOS_SERVER_PORT:-8765}"
ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) [[ $# -ge 2 ]] || { echo '❌ --port requires a value' >&2; exit 64; }; PORT="$2"; shift 2 ;;
    --log-file|--log-output) ARGS+=("$1"); shift ;;
    --client-origin) [[ $# -ge 2 ]] || { echo '❌ --client-origin requires a URL' >&2; exit 64; }; ARGS+=("$1" "$2"); shift 2 ;;
    -h|--help) exec python3 -m server.main --help ;;
    *) echo "❌ Unknown argument: $1" >&2; echo 'Usage: ./start-server.sh [--port N] [--log-file] [--log-output] [--client-origin URL]' >&2; exit 64 ;;
  esac
done
exec python3 -m server.main --port "$PORT" ${ARGS[@]+"${ARGS[@]}"}
