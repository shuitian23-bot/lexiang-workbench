#!/bin/sh
cd "$(dirname "$0")" || exit 1

if command -v python3 >/dev/null 2>&1; then
  exec python3 local-preview-server.py
elif command -v python >/dev/null 2>&1; then
  exec python local-preview-server.py
else
  echo "Python 3 is required to start the local preview."
  exit 1
fi
