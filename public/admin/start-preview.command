#!/bin/bash
set -e
cd "$(dirname "$0")"

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "未找到 Python。请先安装 Python 3，然后重新双击本文件。"
  read -r -p "按回车退出..."
  exit 1
fi

"$PYTHON_BIN" local-preview-server.py
