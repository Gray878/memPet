import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const binariesDir = resolve(projectRoot, 'src-tauri', 'binaries')

const targets = [
  'aarch64-apple-darwin',
  'x86_64-apple-darwin',
]

const launcher = [
  '#!/usr/bin/env bash',
  'set -euo pipefail',
  '',
  'SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
  '',
  'if [[ -n "${MEMPET_SERVER_DIR:-}" && -f "${MEMPET_SERVER_DIR}/app/main.py" ]]; then',
  '  SERVER_DIR="${MEMPET_SERVER_DIR}"',
  'elif [[ -f "${SELF_DIR}/../Resources/backend-runtime/memPet-server/app/main.py" ]]; then',
  '  SERVER_DIR="${SELF_DIR}/../Resources/backend-runtime/memPet-server"',
  'elif [[ -f "${SELF_DIR}/../backend-runtime/memPet-server/app/main.py" ]]; then',
  '  SERVER_DIR="${SELF_DIR}/../backend-runtime/memPet-server"',
  'elif [[ -f "${SELF_DIR}/../../memPet-server/app/main.py" ]]; then',
  '  SERVER_DIR="${SELF_DIR}/../../memPet-server"',
  'elif [[ -f "${SELF_DIR}/../../../../memPet-server/app/main.py" ]]; then',
  '  SERVER_DIR="${SELF_DIR}/../../../../memPet-server"',
  'else',
  '  echo "[memPet-sidecar] memPet-server runtime not found" >&2',
  '  exit 1',
  'fi',
  '',
  'cd "${SERVER_DIR}"',
  '',
  'UV_CACHE_DIR_DEFAULT="${TMPDIR:-/tmp}/mempet-uv-cache"',
  'export UV_CACHE_DIR="${UV_CACHE_DIR:-$UV_CACHE_DIR_DEFAULT}"',
  'mkdir -p "${UV_CACHE_DIR}" || true',
  '',
  'if [[ -x "${SERVER_DIR}/.venv/bin/python" ]]; then',
  '  exec "${SERVER_DIR}/.venv/bin/python" -m uvicorn app.main:app --host 127.0.0.1 --port 8000',
  'fi',
  '',
  'if [[ -x "${SERVER_DIR}/.venv/bin/uv" ]]; then',
  '  exec "${SERVER_DIR}/.venv/bin/uv" run --no-sync fastapi run app/main.py --host 127.0.0.1 --port 8000',
  'fi',
  '',
  'if command -v uv >/dev/null 2>&1; then',
  '  exec uv run --no-sync fastapi run app/main.py --host 127.0.0.1 --port 8000',
  'fi',
  '',
  'if command -v python3 >/dev/null 2>&1; then',
  '  exec python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000',
  'fi',
  '',
  'echo "[memPet-sidecar] python runtime not found" >&2',
  'exit 1',
  '',
].join('\n')

mkdirSync(binariesDir, { recursive: true })

for (const target of targets) {
  const filePath = resolve(binariesDir, `memPet-server-${target}`)
  writeFileSync(filePath, launcher, 'utf8')
  chmodSync(filePath, 0o755)
  console.log(`✓ prepared sidecar launcher: ${filePath}`)
}
