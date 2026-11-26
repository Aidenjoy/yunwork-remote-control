import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join, relative, resolve, sep } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const FALLBACK = join(ROOT, 'bundled-connector')
const ENV_SOURCE = process.env['YUNWORK_CONNECTOR_SOURCE']?.trim()
const YUNCONTROL_CONNECTOR = resolve(ROOT, '..', 'yuncontrol', 'connector')
const SOURCE = ENV_SOURCE || (existsSync(YUNCONTROL_CONNECTOR) ? YUNCONTROL_CONNECTOR : FALLBACK)
const TARGET = join(ROOT, 'lib', 'bundled-connector')

if (!existsSync(SOURCE)) {
  throw new Error(`Missing connector source directory at ${SOURCE}`)
}

const IGNORED_PARTS = new Set(['.venv', '__pycache__', '.pytest_cache', '.ruff_cache', '_reference', '_deprecated', 'tests', '.git'])

rmSync(TARGET, { recursive: true, force: true })
mkdirSync(TARGET, { recursive: true })

for (const entry of ['pyproject.toml', 'connector']) {
  const srcEntry = join(SOURCE, entry)
  if (!existsSync(srcEntry)) {
    throw new Error(`Missing connector entry ${entry} at ${SOURCE}`)
  }
  cpSync(srcEntry, join(TARGET, entry), {
    recursive: true,
    filter: (src) => !relative(SOURCE, src).split(sep).some(part => IGNORED_PARTS.has(part)) && !basename(src).endsWith('.pyc'),
  })
}

// pyproject.toml declares readme = "README.md" for hatchling; emit a minimal file without upstream branding.
writeFileSync(join(TARGET, 'README.md'), '# Yundashi Remote Control Connector\n', 'utf8')

// Ensure Python Connector honors DSH_HOME/anywhere/dsh-bridge whenever YUNWORK_ANYWHERE_RUNTIME_TYPE=yunwork,
// even when Web requests runtime_type="dsh".
const providerConfigPath = join(TARGET, 'connector', 'runtimes', 'dsh', 'provider_config.py')
const providerConfigRaw = readFileSync(providerConfigPath, 'utf8')
const oldCondition = 'if runtime_type == "yunwork" and dsh_home_env and Path(dsh_home_env).is_absolute():'
const newCondition = 'if (runtime_type == "yunwork" or os.environ.get("YUNWORK_ANYWHERE_RUNTIME_TYPE", "").strip() == "yunwork") and dsh_home_env and Path(dsh_home_env).is_absolute():'
if (!providerConfigRaw.includes(newCondition)) {
  if (!providerConfigRaw.includes(oldCondition)) {
    throw new Error(`Failed to patch bridge_directory in ${providerConfigPath}: target line not found`)
  }
  writeFileSync(providerConfigPath, providerConfigRaw.replace(oldCondition, newCondition), 'utf8')
}

process.stdout.write(`Copied connector from ${SOURCE} -> ${TARGET}\n`)
