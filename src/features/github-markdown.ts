import * as vscode from 'vscode'

interface MarkdownIt {
  renderer: {
    render(...args: unknown[]): string
  }
}

export interface MarkdownPreviewApi {
  extendMarkdownIt(md: MarkdownIt): MarkdownIt
}

const SECTION = 'vscodeTools.githubMarkdown'
const REFRESH_COMMAND = 'markdown.preview.refresh'

const COLOR_MODES = ['auto', 'system', 'light', 'dark'] as const
const THEMES = [
  'light',
  'light_high_contrast',
  'light_colorblind',
  'light_tritanopia',
  'dark',
  'dark_high_contrast',
  'dark_colorblind',
  'dark_tritanopia',
  'dark_dimmed',
] as const

const select = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.find(option => option === value) ?? fallback

const withGithubStyling = (html: string): string => {
  const config = vscode.workspace.getConfiguration(SECTION)
  if (!config.get('enabled', true)) return html

  const attributes = [
    `data-color-mode="${select(config.get('colorTheme'), COLOR_MODES, 'auto')}"`,
    `data-light-theme="${select(config.get('lightTheme'), THEMES, 'light')}"`,
    `data-dark-theme="${select(config.get('darkTheme'), THEMES, 'dark')}"`,
  ].join(' ')

  return `<div class="github-markdown" ${attributes}><div class="github-markdown__content">${html}</div></div>`
}

export const activateGithubMarkdown = (context: vscode.ExtensionContext): MarkdownPreviewApi => {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(SECTION)) void vscode.commands.executeCommand(REFRESH_COMMAND)
    })
  )

  return {
    extendMarkdownIt: md => {
      const render = md.renderer.render.bind(md.renderer)
      md.renderer.render = (...args) => withGithubStyling(render(...args))
      return md
    },
  }
}
