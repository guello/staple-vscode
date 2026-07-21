import type * as vscode from 'vscode'

import { activateGhosttySyntax } from './features/ghostty-syntax'
import { activateGitInstantRefresh } from './features/git-instant-refresh'
import { activateOptimizeImage } from './features/optimize-images'
import { activateSortObjectsByKey } from './features/sort-objects-by-key'
import { activateToggleQuotes } from './features/toggle-quotes'

export function activate(context: vscode.ExtensionContext): void {
  void activateGitInstantRefresh(context)
  activateGhosttySyntax(context)
  activateOptimizeImage(context)
  activateSortObjectsByKey(context)
  activateToggleQuotes(context)
}

export function deactivate(): void {}
