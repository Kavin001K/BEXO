#!/usr/bin/env bash
# EAS runs `pnpm install --frozen-lockfile` at the monorepo root. pnpm 9 and 10
# disagree on how overrides from pnpm-workspace.yaml are fingerprinted against
# lockfile v9, which causes ERR_PNPM_LOCKFILE_CONFIG_MISMATCH on the worker unless
# we pin the same pnpm as local (see root package.json "packageManager").
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${ROOT}" ]]; then
  HERE="$PWD"
  while [[ "$HERE" != "/" ]]; do
    if [[ -f "$HERE/pnpm-workspace.yaml" ]]; then
      ROOT="$HERE"
      break
    fi
    HERE="$(dirname "$HERE")"
  done
fi

if [[ -z "${ROOT}" || ! -f "$ROOT/pnpm-workspace.yaml" ]]; then
  echo "eas-build-pre-install: could not find monorepo root (pnpm-workspace.yaml)" >&2
  exit 1
fi

cd "$ROOT"
echo "eas-build-pre-install: repo root is ${ROOT}"

export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
corepack enable
corepack prepare pnpm@10.33.2 --activate
pnpm -v
