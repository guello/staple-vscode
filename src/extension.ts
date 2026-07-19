import type * as vscode from 'vscode'
import { activateGhosttySyntax } from './features/ghostty-syntax'
import { activateGitInstantRefresh } from './features/git-instant-refresh'
import { activateToggleQuotes } from './features/toggle-quotes'

export function activate(context: vscode.ExtensionContext): void {
  void activateGitInstantRefresh(context)
  activateToggleQuotes(context)
  activateGhosttySyntax(context)
}

export function deactivate(): void {}
