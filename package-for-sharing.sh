#!/usr/bin/env bash
# Creates a single .zip of this prototype (source only — no node_modules, venv, or local DBs).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-${ROOT}/../expiry-management-prototype-SHARE.zip}"
TMP="$(mktemp -d)"
NAME="expiry-management-prototype"

rsync -a --exclude 'node_modules' \
  --exclude 'venv' \
  --exclude '__pycache__' \
  --exclude '*.db' \
  --exclude 'dist' \
  --exclude '.DS_Store' \
  --exclude 'figma-screens' \
  "${ROOT}/" "${TMP}/${NAME}/"

( cd "${TMP}" && zip -r -q "${OUT}" "${NAME}" )
rm -rf "${TMP}"
echo "Created: ${OUT}"
ls -la "${OUT}"
