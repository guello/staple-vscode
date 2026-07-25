import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { type Plugin, build } from 'esbuild'

import { generateGithubMarkdown } from './generate-github-markdown.mts'

const entryPoints = ['src/extension.ts', 'src/features/toml/client.ts', 'src/features/toml/server.ts']

const TAPLO_WASM_OUTPUT = 'dist/features/toml/taplo.wasm'

const taploWasm: Plugin = {
  name: 'taplo-wasm',
  setup(pluginBuild) {
    pluginBuild.onLoad({ filter: /@taplo[/\\]lsp[/\\]dist[/\\]index\.js$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8')
      const match = /const P=SA\("([A-Za-z0-9+/]+={0,2})"\)/.exec(source)
      if (!match) throw new Error('Embedded Taplo wasm blob not found, the @taplo/lsp bundle layout changed')

      const wasm = Buffer.from(match[1], 'base64')
      if (wasm.subarray(0, 4).toString('hex') !== '0061736d') throw new Error('Decoded Taplo blob is not a wasm module')

      await mkdir(dirname(TAPLO_WASM_OUTPUT), { recursive: true })
      await writeFile(TAPLO_WASM_OUTPUT, wasm)

      const contents = source.replace(
        match[0],
        'const P=require("node:fs").readFileSync(require("node:path").join(__dirname,"taplo.wasm"))'
      )
      return { contents, loader: 'js' }
    })
  },
}

await Promise.all([
  build({
    entryPoints,
    outdir: 'dist',
    outbase: 'src',
    bundle: true,
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    minify: true,
    plugins: [taploWasm],
    logLevel: 'info',
  }),
  generateGithubMarkdown(),
])
