import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const FALLBACK = join(ROOT, 'bundled-connector')
const ENV_SOURCE = process.env['YUNWORK_CONNECTOR_SOURCE']?.trim()
const YUNCONTROL_CONNECTOR = resolve(ROOT, '..', 'yuncontrol', 'connector')
const SOURCE = ENV_SOURCE || (existsSync(YUNCONTROL_CONNECTOR) ? YUNCONTROL_CONNECTOR : FALLBACK)
const TARGET = join(ROOT, 'lib', 'bundled-connector')

if (!existsSync(SOURCE)) {
  throw new Error(`Missing connector source directory at ${SOURCE}`)
}

const EXCLUDED_NAMES = new Set(['.venv', '__pycache__', '.pytest_cache', 'tests', '.git'])

rmSync(TARGET, { recursive: true, force: true })
mkdirSync(join(ROOT, 'lib'), { recursive: true })
cpSync(SOURCE, TARGET, {
  recursive: true,
  filter: (src) => {
    const base = src.split(/[/\\]/).pop() ?? ''
    return !EXCLUDED_NAMES.has(base) && !base.endsWith('.pyc')
  },
})
process.stdout.write(`Copied connector from ${SOURCE} -> ${TARGET}\n`)
