#!/usr/bin/env bash
# Abre a Prancheta no navegador padrão.
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARQ="$DIR/index.html"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$ARQ" >/dev/null 2>&1 &
elif command -v sensible-browser >/dev/null 2>&1; then
  sensible-browser "$ARQ" >/dev/null 2>&1 &
elif command -v firefox >/dev/null 2>&1; then
  firefox "$ARQ" >/dev/null 2>&1 &
else
  echo "Não achei um navegador. Abra este arquivo manualmente: $ARQ"
  exit 1
fi
