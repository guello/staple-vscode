import * as vscode from 'vscode'

interface JsonObject {
  [key: string]: JsonValue
}

type JsonValue = boolean | JsonObject | JsonValue[] | null | number | string

interface JsonObjectItem {
  index: number
  object: JsonObject
  rawValues: ReadonlyMap<string, string>
  text: string
}

interface JsonObjectDocument {
  items: JsonObjectItem[]
  prefix: string
  separators: string[]
  suffix: string
}

interface SortableObject {
  item: JsonObjectItem
  present: boolean
  rawValue: string | undefined
  value: JsonValue | undefined
}

interface JsonNumber {
  digits: string
  magnitude: bigint
  negative: boolean
  zero: boolean
}

const invalidStructure = (): never => {
  throw new Error('Sort Objects By Key: the file must contain an array of objects.')
}

const skipWhitespace = (text: string, start: number): number => {
  let index = start
  while (index < text.length && /[\t\n\r ]/.test(text[index])) index++
  return index
}

const findStringEnd = (text: string, start: number): number => {
  let escaped = false
  for (let index = start + 1; index < text.length; index++) {
    const character = text[index]
    if (escaped) {
      escaped = false
    } else if (character === '\\') {
      escaped = true
    } else if (character === '"') {
      return index + 1
    }
  }
  throw new SyntaxError('Invalid JSON')
}

const findCompositeEnd = (text: string, start: number): number => {
  const closers: string[] = [text[start] === '{' ? '}' : ']']
  let inString = false
  let escaped = false

  for (let index = start + 1; index < text.length; index++) {
    const character = text[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }
      continue
    }

    if (character === '"') {
      inString = true
      continue
    }
    if (character === '{') closers.push('}')
    if (character === '[') closers.push(']')
    if (character !== '}' && character !== ']') continue
    if (closers.pop() !== character) invalidStructure()
    if (closers.length === 0) return index + 1
  }

  return invalidStructure()
}

const findValueEnd = (text: string, start: number): number => {
  if (text[start] === '"') return findStringEnd(text, start)
  if (text[start] === '{' || text[start] === '[') return findCompositeEnd(text, start)

  let index = start
  while (index < text.length && !/[\t\n\r ,}]/.test(text[index])) index++
  return index
}

const rawValuesFor = (text: string): ReadonlyMap<string, string> => {
  const values = new Map<string, string>()
  let index = skipWhitespace(text, 1)

  while (text[index] !== '}') {
    const keyEnd = findStringEnd(text, index)
    const key: string = JSON.parse(text.slice(index, keyEnd))
    index = skipWhitespace(text, keyEnd)
    if (text[index] !== ':') throw new SyntaxError('Invalid JSON')
    const valueStart = skipWhitespace(text, index + 1)
    const valueEnd = findValueEnd(text, valueStart)
    values.set(key, text.slice(valueStart, valueEnd))
    index = skipWhitespace(text, valueEnd)
    if (text[index] === '}') break
    if (text[index] !== ',') throw new SyntaxError('Invalid JSON')
    index = skipWhitespace(text, index + 1)
  }

  return values
}

const parseObject = (text: string): JsonObject => {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new SyntaxError('Invalid JSON')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return invalidStructure()
  return parsed as JsonObject
}

export const parseJsonObjectDocument = (text: string): JsonObjectDocument => {
  let index = text.charCodeAt(0) === 0xfeff ? 1 : 0
  index = skipWhitespace(text, index)
  if (text[index] !== '[') return invalidStructure()
  index = skipWhitespace(text, index + 1)

  if (text[index] === ']') {
    const end = skipWhitespace(text, index + 1)
    if (end !== text.length) throw new SyntaxError('Invalid JSON')
    return { items: [], prefix: text, separators: [], suffix: '' }
  }

  const spans: { end: number; start: number }[] = []
  const items: JsonObjectItem[] = []

  while (index < text.length) {
    if (text[index] !== '{') return invalidStructure()
    const start = index
    const end = findCompositeEnd(text, start)
    const objectText = text.slice(start, end)
    items.push({
      index: items.length,
      object: parseObject(objectText),
      rawValues: rawValuesFor(objectText),
      text: objectText,
    })
    spans.push({ start, end })

    index = skipWhitespace(text, end)
    if (text[index] === ']') break
    if (text[index] !== ',') throw new SyntaxError('Invalid JSON')
    index = skipWhitespace(text, index + 1)
    if (text[index] === ']') throw new SyntaxError('Invalid JSON')
  }

  if (text[index] !== ']') throw new SyntaxError('Invalid JSON')
  const documentEnd = skipWhitespace(text, index + 1)
  if (documentEnd !== text.length) throw new SyntaxError('Invalid JSON')

  const separators = spans.slice(0, -1).map((span, spanIndex) => text.slice(span.end, spans[spanIndex + 1].start))
  return {
    items,
    prefix: text.slice(0, spans[0].start),
    separators,
    suffix: text.slice(spans[spans.length - 1].end),
  }
}

export const getObjectKeys = (items: JsonObjectItem[]): string[] => {
  const keys = new Set<string>()
  for (const { object } of items) {
    for (const key of Object.keys(object)) keys.add(key)
  }
  return [...keys].sort((left, right) => (left < right ? -1 : Number(left > right)))
}

const parseJsonNumber = (text: string): JsonNumber => {
  const match = /^(-)?(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text)
  if (!match) throw new SyntaxError('Invalid JSON number')
  const fraction = match[3] ?? ''
  const digits = `${match[2]}${fraction}`.replace(/^0+/, '') || '0'
  const exponent = BigInt(match[4] ?? 0) - BigInt(fraction.length)
  return {
    digits,
    magnitude: BigInt(digits.length) + exponent,
    negative: match[1] === '-',
    zero: digits === '0',
  }
}

const compareJsonNumbers = (leftText: string, rightText: string): number => {
  const left = parseJsonNumber(leftText)
  const right = parseJsonNumber(rightText)
  if (left.zero && right.zero) return 0
  if (left.zero) return right.negative ? 1 : -1
  if (right.zero) return left.negative ? -1 : 1
  if (left.negative !== right.negative) return left.negative ? -1 : 1

  let magnitude = 0
  if (left.magnitude !== right.magnitude) {
    magnitude = left.magnitude < right.magnitude ? -1 : 1
  } else {
    const length = Math.max(left.digits.length, right.digits.length)
    const leftDigits = left.digits.padEnd(length, '0')
    const rightDigits = right.digits.padEnd(length, '0')
    if (leftDigits !== rightDigits) magnitude = leftDigits < rightDigits ? -1 : 1
  }
  return left.negative ? -magnitude : magnitude
}

const compareValues = (
  left: JsonValue | undefined,
  right: JsonValue | undefined,
  leftRaw: string | undefined,
  rightRaw: string | undefined
): number => {
  if (typeof left === 'number' && typeof right === 'number' && leftRaw && rightRaw) {
    return compareJsonNumbers(leftRaw, rightRaw)
  }

  const leftText = typeof left === 'string' ? left : JSON.stringify(left)
  const rightText = typeof right === 'string' ? right : JSON.stringify(right)
  if (leftText === rightText) return 0
  return leftText < rightText ? -1 : 1
}

export const sortObjectsByKey = (items: JsonObjectItem[], key: string): JsonObjectItem[] => {
  const sortable: SortableObject[] = items.map(item => ({
    item,
    present: Object.hasOwn(item.object, key),
    rawValue: item.rawValues.get(key),
    value: item.object[key],
  }))

  sortable.sort((left, right) => {
    if (left.present !== right.present) return left.present ? -1 : 1
    if (!left.present) return left.item.index - right.item.index
    return compareValues(left.value, right.value, left.rawValue, right.rawValue) || left.item.index - right.item.index
  })

  return sortable.map(({ item }) => item)
}

export const reorderJsonObjects = (document: JsonObjectDocument, items: JsonObjectItem[]): string => {
  if (items.length === 0) return document.prefix

  let result = document.prefix
  for (let index = 0; index < items.length; index++) {
    result += items[index].text
    if (index < document.separators.length) result += document.separators[index]
  }
  return result + document.suffix
}

const COMMAND = 'vscodeTools.sortObjectsByKey'

const run = async (): Promise<void> => {
  const editor = vscode.window.activeTextEditor
  if (!editor) return

  const original = editor.document.getText()
  const version = editor.document.version
  let document
  try {
    document = parseJsonObjectDocument(original)
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? 'Sort Objects By Key: the file is not valid JSON.'
        : error instanceof Error
          ? error.message
          : 'Sort Objects By Key failed.'
    void vscode.window.showErrorMessage(message)
    return
  }

  const keys = getObjectKeys(document.items)
  if (keys.length === 0) {
    void vscode.window.showInformationMessage('Sort Objects By Key: no object keys found.')
    return
  }

  const key = await vscode.window.showQuickPick(keys, {
    placeHolder: 'Select the key to sort by',
  })
  if (!key) return
  if (editor.document.version !== version) {
    void vscode.window.showWarningMessage(
      'Sort Objects By Key: the file changed while selecting a key. Run the command again.'
    )
    return
  }

  const sorted = sortObjectsByKey(document.items, key)
  const replacement = reorderJsonObjects(document, sorted)
  const entireDocument = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(original.length))
  const applied = await editor.edit(builder => builder.replace(entireDocument, replacement))
  if (!applied) void vscode.window.showErrorMessage('Sort Objects By Key: the file could not be updated.')
}

export const activateSortObjectsByKey = (context: vscode.ExtensionContext): void => {
  context.subscriptions.push(vscode.commands.registerCommand(COMMAND, run))
}
