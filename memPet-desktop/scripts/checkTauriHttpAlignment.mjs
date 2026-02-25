import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')

function normalizeVersion(input) {
  if (!input || typeof input !== 'string') {
    return ''
  }
  return input.trim().replace(/^[~^=]+/, '')
}

function fail(message) {
  console.error(`[check:http-alignment] ${message}`)
  process.exit(1)
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'))
}

const packageJsonPath = resolve(projectRoot, 'package.json')
const cargoTomlPath = resolve(projectRoot, 'src-tauri', 'Cargo.toml')
const cargoLockPath = resolve(projectRoot, 'Cargo.lock')
const aclManifestPath = resolve(projectRoot, 'src-tauri', 'gen', 'schemas', 'acl-manifests.json')

const packageJson = readJson(packageJsonPath)
const jsRawVersion = packageJson.dependencies?.['@tauri-apps/plugin-http']
const jsVersion = normalizeVersion(jsRawVersion)

if (!jsVersion) {
  fail('package.json 缺少 @tauri-apps/plugin-http 版本声明')
}

const cargoToml = readFileSync(cargoTomlPath, 'utf8')
const cargoTomlMatch = cargoToml.match(/tauri-plugin-http\s*=\s*"([^"]+)"/)
const rustTomlVersion = normalizeVersion(cargoTomlMatch?.[1] || '')

if (!rustTomlVersion) {
  fail('src-tauri/Cargo.toml 缺少 tauri-plugin-http 版本声明')
}

if (!existsSync(cargoLockPath)) {
  fail('Cargo.lock 不存在，请先执行一次 cargo check')
}

const cargoLock = readFileSync(cargoLockPath, 'utf8')
const cargoLockMatch = cargoLock.match(/\[\[package\]\]\s*name = "tauri-plugin-http"\s*version = "([^"]+)"/m)
const rustLockVersion = normalizeVersion(cargoLockMatch?.[1] || '')

if (!rustLockVersion) {
  fail('Cargo.lock 中未找到 tauri-plugin-http 版本，请先执行 cargo update -p tauri-plugin-http')
}

if (!existsSync(aclManifestPath)) {
  fail('acl-manifests.json 不存在，请先执行 cargo check 生成 ACL 清单')
}

const aclManifest = readJson(aclManifestPath)
const httpDefaultPermissions = aclManifest?.http?.default_permission?.permissions || []
const hasCancelBodyPermission = Array.isArray(httpDefaultPermissions)
  && httpDefaultPermissions.includes('allow-fetch-cancel-body')

const issues = []
if (jsVersion !== rustTomlVersion) {
  issues.push(`JS 版本 (${jsVersion}) 与 Cargo.toml 版本 (${rustTomlVersion}) 不一致`)
}
if (jsVersion !== rustLockVersion) {
  issues.push(`JS 版本 (${jsVersion}) 与 Cargo.lock 版本 (${rustLockVersion}) 不一致`)
}
if (!hasCancelBodyPermission) {
  issues.push('ACL 清单缺少 allow-fetch-cancel-body，请升级 tauri-plugin-http 并重新生成 schema')
}

if (issues.length > 0) {
  fail(`检测失败:\n- ${issues.join('\n- ')}`)
}

console.log(
  `[check:http-alignment] OK | plugin-http=${jsVersion} | acl.allow-fetch-cancel-body=${hasCancelBodyPermission}`,
)
