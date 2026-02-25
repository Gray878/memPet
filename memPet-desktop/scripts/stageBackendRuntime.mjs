import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const serverRoot = resolve(projectRoot, '../memPet-server')
const runtimeRoot = resolve(projectRoot, 'src-tauri', 'backend-runtime', 'memPet-server')

const venvPath = resolve(serverRoot, '.venv')
const includeVenv = process.env.MEMPET_INCLUDE_VENV === '0'
  ? false
  : existsSync(venvPath)
const includeData = process.env.MEMPET_INCLUDE_DATA === '1'

if (!existsSync(serverRoot)) {
  throw new Error(`memPet-server not found: ${serverRoot}`)
}

rmSync(runtimeRoot, { recursive: true, force: true })
mkdirSync(runtimeRoot, { recursive: true })

const entries = [
  'app',
  'scripts',
  'pyproject.toml',
  'uv.lock',
  '.env.example',
]

if (existsSync(resolve(serverRoot, '.env'))) {
  entries.push('.env')
}
if (includeData && existsSync(resolve(serverRoot, 'data'))) {
  entries.push('data')
}
if (includeVenv) {
  entries.push('.venv')
}

for (const entry of entries) {
  const from = resolve(serverRoot, entry)
  const to = resolve(runtimeRoot, entry)
  cpSync(from, to, { recursive: true })
  console.log(`✓ staged: ${entry}`)
}

console.log(`✓ backend runtime staged at: ${runtimeRoot}`)
console.log(`  includeVenv=${includeVenv} includeData=${includeData}`)
