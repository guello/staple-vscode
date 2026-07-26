import * as vscode from 'vscode'

import { type MarkdownIt } from './markdown-it'
import { resolveStates, taskLists } from './task-lists'

export interface MarkdownPreviewApi {
  extendMarkdownIt(md: MarkdownIt): MarkdownIt
}

const SECTION = 'vscodeTools.markdown'
const REFRESH_COMMAND = 'markdown.preview.refresh'

const THEME_MODES = ['auto', 'system', 'light', 'dark'] as const
const THEMES = [
  'default',
  'github-light',
  'github-light-high-contrast',
  'github-light-colorblind',
  'github-light-tritanopia',
  'github-dark',
  'github-dark-high-contrast',
  'github-dark-colorblind',
  'github-dark-tritanopia',
  'github-dark-dimmed',
] as const

const configuration = () => vscode.workspace.getConfiguration(SECTION)

const select = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.find(option => option === value) ?? fallback

const wrap = (html: string) => {
  const config = configuration()
  const attributes = [
    `data-theme-mode="${select(config.get('mode'), THEME_MODES, 'auto')}"`,
    `data-light-theme="${select(config.get('lightTheme'), THEMES, 'github-light')}"`,
    `data-dark-theme="${select(config.get('darkTheme'), THEMES, 'github-dark')}"`,
  ].join(' ')

  return `<div class="markdown" ${attributes}><div class="markdown__content">${html}</div></div>`
}

export const activateMarkdown = (context: vscode.ExtensionContext): MarkdownPreviewApi => {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(SECTION)) void vscode.commands.executeCommand(REFRESH_COMMAND)
    })
  )

  return {
    extendMarkdownIt: md => {
      taskLists(md, () => {
        const config = configuration()
        return {
          enabled: config.get('enabled', true) && config.get('taskLists', true),
          states: resolveStates(config.get('checkboxes')),
        }
      })

      const render = md.renderer.render.bind(md.renderer)
      md.renderer.render = (...args) => {
        const html = render(...args)
        return configuration().get('enabled', true) ? wrap(html) : html
      }

      return md
    },
  }
}
