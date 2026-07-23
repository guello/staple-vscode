import type * as vscode from 'vscode'

import { activateGhosttySyntax } from './features/ghostty-syntax'
import { activateGitInstantRefresh } from './features/git-instant-refresh'
import { activateOptimizeImage } from './features/optimize-images'
import { activateSortObjectsByKey } from './features/sort-objects-by-key'
import { activateToggleQuotes } from './features/toggle-quotes'
import { activateToml, deactivateToml } from './features/toml'

export const activate = (context: vscode.ExtensionContext): void => {
  void activateGitInstantRefresh(context)
  activateGhosttySyntax(context)
  activateOptimizeImage(context)
  activateSortObjectsByKey(context)
  activateToggleQuotes(context)
  activateToml(context)
}

export const deactivate = async (): Promise<void> => {
  await deactivateToml()
}
