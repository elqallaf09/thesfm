#!/usr/bin/env bash
set -euo pipefail

# The hosted runner's Azure mirror can stall while downloading WebKit fonts.
# Keep Ubuntu's signed packages and use its official archive over HTTPS.
if [[ -f /etc/apt/apt-mirrors.txt ]]; then
  sudo sed -i 's|http://azure.archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g' /etc/apt/apt-mirrors.txt
fi
if command -v apt-get >/dev/null 2>&1; then
  printf '%s\n' 'Acquire::Retries "3";' 'Acquire::http::Timeout "30";' 'Acquire::https::Timeout "30";' \
    | sudo tee /etc/apt/apt.conf.d/99sfm-network >/dev/null
fi

pnpm exec playwright install --with-deps "$@"
