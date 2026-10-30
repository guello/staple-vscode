import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const OUTPUT_DIR = join(import.meta.dirname, '..', 'languages', 'ghostty', 'reference')
const CANDIDATES = [process.env.GHOSTTY, 'ghostty', '/Applications/Ghostty.app/Contents/MacOS/ghostty']

const run = promisify(execFile)

const findGhostty = async (): Promise<string> => {
  for (const candidate of CANDIDATES) {
    if (!candidate) continue
    try {
      await run(candidate, ['--version'])
      return candidate
    } catch {}
  }
  throw new Error('Ghostty not found. Install it, or set GHOSTTY to the path of its binary.')
}

const ghostty = await findGhostty()
const output = async (...args: string[]): Promise<string> =>
  (await run(ghostty, args, { maxBuffer: 16 * 1024 * 1024 })).stdout

const [version, options, actions] = await Promise.all([
  output('--version'),
  output('+show-config', '--default', '--docs'),
  output('+list-actions', '--docs'),
])

const match = /^Ghostty (\S+)/m.exec(version)
if (!match) throw new Error(`Unexpected ghostty --version output: ${version.split('\n')[0]}`)

const header = `# Generated from Ghostty ${match[1]} by scripts/generate-ghostty-reference.mts. Do not edit.\n\n`
const normalize = (text: string): string =>
  `${header}${text
    .replaceAll(/[\u2013\u2014]/g, '-')
    .replaceAll(/[ \t]+$/gm, '')
    .trimEnd()}\n`

await mkdir(OUTPUT_DIR, { recursive: true })
await Promise.all([
  writeFile(join(OUTPUT_DIR, 'options.txt'), normalize(options)),
  writeFile(join(OUTPUT_DIR, 'actions.txt'), normalize(actions)),
])
console.info(`Wrote the Ghostty ${match[1]} reference to ${OUTPUT_DIR}`)
