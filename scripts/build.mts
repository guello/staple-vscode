import { build } from 'esbuild'

import { generateGithubMarkdown } from './generate-github-markdown.mts'

const entryPoints = ['src/extension.ts', 'src/features/toml/client.ts', 'src/features/toml/server.ts']

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
    logLevel: 'info',
  }),
  generateGithubMarkdown(),
])
