import type * as vscode from 'vscode'

import { activateGhosttySyntax } from './features/ghostty-syntax'
import { activateGitInstantRefresh } from './features/git-instant-refresh'
import { type MarkdownPreviewApi, activateMarkdown } from './features/markdown'
import { activateOptimizeImage } from './features/optimize-images'
import { activateSortObjectsByKey } from './features/sort-objects-by-key'
import { activateToggleQuotes } from './features/toggle-quotes'
import { activateToml, deactivateToml } from './features/toml'

export const activate = (context: vscode.ExtensionContext): MarkdownPreviewApi => {
  void activateGitInstantRefresh(context)
  activateGhosttySyntax(context)
  activateOptimizeImage(context)
  activateSortObjectsByKey(context)
  activateToggleQuotes(context)
  activateToml(context)
  return activateMarkdown(context)
}

export const deactivate = async (): Promise<void> => {
  await deactivateToml()
}
