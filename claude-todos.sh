#!/usr/bin/env bash
set -euo pipefail
echo 'Claude Todos v4 no longer accepts a session id.'
echo 'Start the backend with: ./start-server.sh'
echo 'Start the client with:  ./start-client.sh'
if [[ "${1:-}" == '-h' || "${1:-}" == '--help' || $# -eq 0 ]]; then exit 0; fi
exit 64
