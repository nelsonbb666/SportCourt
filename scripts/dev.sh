#!/usr/bin/env bash
# Levanta backend (puerto 8000) y frontend (puerto 5173) en modo desarrollo.
set -e
(cd "$(dirname "$0")/../backend" && uvicorn app.main:app --reload --port 8000) &
BACK_PID=$!
trap 'kill $BACK_PID' EXIT
(cd "$(dirname "$0")/../frontend" && npm run dev)
