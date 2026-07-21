import type * as vscode from 'vscode'

import { activateGhosttySyntax } from './features/ghostty-syntax'
import { activateGitInstantRefresh } from './features/git-instant-refresh'
import { activateOptimizeImage } from './features/optimize-images'
import { activateOptimizeImage } from './features/optimize-image'
import { activateToggleQuotes } from './features/toggle-quotes'

export function activate(context: vscode.ExtensionContext): void {
  void activateGitInstantRefresh(context)
  activateGhosttySyntax(context)
  activateOptimizeImage(context)
  activateToggleQuotes(context)
}

export function deactivate(): void {}
