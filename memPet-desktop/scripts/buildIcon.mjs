import { execSync } from 'node:child_process'
import { env, platform } from 'node:process'

const isMac = env.PLATFORM?.startsWith('macos') ?? platform === 'darwin'
const logoName = isMac ? 'logo-mac' : 'logo'

execSync(`tauri icon src-tauri/assets/${logoName}.png`, { stdio: 'inherit' })
