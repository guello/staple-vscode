import * as vscode from 'vscode'

const SECTION = 'vscodeTools.toggleQuotes'

interface QuotePair {
  begin: string
  end: string
}

interface ToggleEdit {
  start: number
  end: number
  text: string
}

function normalizeChars(raw: unknown): QuotePair[] {
  if (!Array.isArray(raw)) return []
  const pairs: QuotePair[] = []
  for (const item of raw) {
    if (typeof item === 'string' && item.length > 0) {
      pairs.push({ begin: item, end: item })
    } else if (
      Array.isArray(item) &&
      item.length === 2 &&
      typeof item[0] === 'string' &&
      typeof item[1] === 'string' &&
      item[0].length > 0 &&
      item[1].length > 0
    ) {
      pairs.push({ begin: item[0], end: item[1] })
    }
  }
  return pairs
}

function isEscaped(line: string, index: number): boolean {
  let backslashes = 0
  for (let i = index - 1; i >= 0 && line[i] === '\\'; i--) backslashes++
  return backslashes % 2 === 1
}

function occurrences(line: string, token: string): number[] {
  const found: number[] = []
  let index = line.indexOf(token)
  while (index !== -1) {
    if (!isEscaped(line, index)) found.push(index)
    index = line.indexOf(token, index + token.length)
  }
  return found
}

interface Enclosing {
  pairIndex: number
  begin: number
  end: number
}

function findSymmetric(line: string, column: number, pair: QuotePair, pairIndex: number): Enclosing | undefined {
  const spots = occurrences(line, pair.begin)
  for (let i = 0; i + 1 < spots.length; i += 2) {
    const begin = spots[i]
    const end = spots[i + 1]
    if (begin <= column && column <= end + pair.end.length) return { pairIndex, begin, end }
  }
  return undefined
}

function findAsymmetric(line: string, column: number, pair: QuotePair, pairIndex: number): Enclosing | undefined {
  const begins = occurrences(line, pair.begin).filter(index => index <= column)
  const begin = begins[begins.length - 1]
  if (begin === undefined) return undefined
  const end = occurrences(line, pair.end).find(index => index >= Math.max(column, begin + pair.begin.length))
  if (end === undefined) return undefined
  return { pairIndex, begin, end }
}

function convertBody(body: string, from: QuotePair, to: QuotePair): string {
  let result = body
  if (from.begin === from.end && from.begin.length === 1) {
    result = result.replaceAll(`\\${from.begin}`, from.begin)
  }
  if (to.begin === to.end && to.begin.length === 1) {
    result = result.replaceAll(to.begin, `\\${to.begin}`)
  }
  return result
}

function toggleLine(line: string, column: number, pairs: QuotePair[]): ToggleEdit | undefined {
  let innermost: Enclosing | undefined
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]
    const found = pair.begin === pair.end ? findSymmetric(line, column, pair, i) : findAsymmetric(line, column, pair, i)
    if (found && (!innermost || found.begin > innermost.begin)) innermost = found
  }
  if (!innermost) return undefined

  const from = pairs[innermost.pairIndex]
  const to = pairs[(innermost.pairIndex + 1) % pairs.length]
  const body = line.slice(innermost.begin + from.begin.length, innermost.end)

  return {
    start: innermost.begin,
    end: innermost.end + from.end.length,
    text: to.begin + convertBody(body, from, to) + to.end,
  }
}

export function activateToggleQuotes(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand('vscodeTools.toggleQuotes', editor => {
      const scope = { uri: editor.document.uri, languageId: editor.document.languageId }
      const config = vscode.workspace.getConfiguration(SECTION, scope)
      if (!config.get('enabled', true)) return

      const pairs = normalizeChars(config.get('chars'))
      if (pairs.length < 2) return

      void editor.edit(builder => {
        for (const selection of editor.selections) {
          const lineNumber = selection.active.line
          const line = editor.document.lineAt(lineNumber)
          const edit = toggleLine(line.text, selection.active.character, pairs)
          if (edit) {
            builder.replace(new vscode.Range(lineNumber, edit.start, lineNumber, edit.end), edit.text)
          }
        }
      })
    })
  )
}
