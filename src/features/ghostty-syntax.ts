import * as vscode from 'vscode'

const SECTION = 'vscodeTools.ghosttySyntax'
const LANGUAGE_ID = 'ghostty'
const GLOBS = [
  '**/ghostty/config',
  '**/ghostty/themes/*',
  '**/com.mitchellh.ghostty/config',
  '**/com.mitchellh.ghostty/themes/*',
]
const HEX = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g

const autoAssociationsEnabled = (): boolean => {
  const config = vscode.workspace.getConfiguration(SECTION)
  return config.get('enabled', true) && config.get('autoAssociations', true)
}

const syncAssociations = async (): Promise<void> => {
  const files = vscode.workspace.getConfiguration('files')
  const current = files.get<Record<string, string>>('associations') ?? {}
  const enabled = autoAssociationsEnabled()

  const next = { ...current }
  let changed = false
  for (const glob of GLOBS) {
    const owned = current[glob] === LANGUAGE_ID
    if (enabled && !(glob in current)) {
      next[glob] = LANGUAGE_ID
      changed = true
    } else if (!enabled && owned) {
      delete next[glob]
      changed = true
    }
  }
  if (!changed) return

  try {
    await files.update('associations', next, vscode.ConfigurationTarget.Global)
  } catch {}
}

const parseHex = (hex: string): vscode.Color | undefined => {
  let value = hex.slice(1)
  if (value.length === 3) value = [...value].map(c => c + c).join('')
  const int = Number.parseInt(value, 16)
  if (Number.isNaN(int)) return undefined

  if (value.length === 6) {
    return new vscode.Color(((int >> 16) & 0xff) / 255, ((int >> 8) & 0xff) / 255, (int & 0xff) / 255, 1)
  }
  if (value.length === 8) {
    return new vscode.Color(((int >> 24) & 0xff) / 255, ((int >> 16) & 0xff) / 255, ((int >> 8) & 0xff) / 255, (int & 0xff) / 255)
  }
  return undefined
}

const toHex = (color: vscode.Color): string => {
  const channel = (n: number): string =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, '0')
  const rgb = `#${channel(color.red)}${channel(color.green)}${channel(color.blue)}`
  return color.alpha < 1 ? `${rgb}${channel(color.alpha)}` : rgb
}

const colorProvider: vscode.DocumentColorProvider = {
  provideDocumentColors(document) {
    const colors: vscode.ColorInformation[] = []
    for (let line = 0; line < document.lineCount; line++) {
      const text = document.lineAt(line).text
      if (text.trimStart().startsWith('#')) continue
      for (const match of text.matchAll(HEX)) {
        const color = parseHex(match[0])
        if (!color || match.index === undefined) continue
        const range = new vscode.Range(line, match.index, line, match.index + match[0].length)
        colors.push(new vscode.ColorInformation(range, color))
      }
    }
    return colors
  },
  provideColorPresentations(color) {
    return [new vscode.ColorPresentation(toHex(color))]
  },
}

export const activateGhosttySyntax = (context: vscode.ExtensionContext): void => {
  void syncAssociations()

  context.subscriptions.push(
    vscode.languages.registerColorProvider({ language: LANGUAGE_ID }, colorProvider),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (
        event.affectsConfiguration(`${SECTION}.enabled`) ||
        event.affectsConfiguration(`${SECTION}.autoAssociations`)
      ) {
        void syncAssociations()
      }
    })
  )
}
