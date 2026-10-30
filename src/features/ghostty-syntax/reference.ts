export interface GhosttyOption {
  docs: string
  default?: string
}

export interface GhosttyReference {
  ghostty: string
  options: Record<string, GhosttyOption>
  actions: Record<string, string>
}

export interface GhosttyToken {
  kind: 'option' | 'action'
  name: string
  start: number
  end: number
}

const HEADER = /^# Generated from Ghostty (\S+)/
const DEFAULT_LINE = /^([a-z][a-z0-9-]*) =(?: (.*))?$/
const ACTION_HEADER = /^([a-z][a-z0-9_]*):$/
const KEY = /^(\s*)([A-Za-z][\w-]*)\s*=\s*/
const ACTION_NAME = /^[a-z][a-z0-9_]*/
const OPTIONS_URL = 'https://ghostty.org/docs/config/reference'
const ACTIONS_URL = 'https://ghostty.org/docs/config/keybind/reference'

const parseOptionDocs = (text: string): Record<string, GhosttyOption> => {
  const options: Record<string, GhosttyOption> = {}
  const defaults: Record<string, string[]> = {}
  let comment: string[] = []
  let docs = ''

  for (const line of text.split('\n')) {
    if (line.startsWith('#')) {
      comment.push(line.replace(/^# ?/, ''))
      continue
    }
    if (line === '') {
      comment = []
      continue
    }
    const match = DEFAULT_LINE.exec(line)
    if (!match) continue

    const [, key, value = ''] = match
    if (comment.length > 0) {
      docs = comment.join('\n').trim()
      comment = []
    }
    options[key] ??= { docs }
    defaults[key] = [...(defaults[key] ?? []), value]
  }

  for (const [key, values] of Object.entries(defaults)) {
    if (values.length === 1 && values[0] !== '') options[key].default = values[0]
  }
  return options
}

const parseActionDocs = (text: string): Record<string, string> => {
  const actions: Record<string, string> = {}
  let name: string | undefined
  let lines: string[] = []

  const flush = (): void => {
    if (name) actions[name] = lines.join('\n').trim()
  }

  for (const line of text.split('\n')) {
    const match = ACTION_HEADER.exec(line)
    if (match) {
      flush()
      name = match[1]
      lines = []
    } else if (name) {
      lines.push(line.replace(/^ {2}/, ''))
    }
  }
  flush()
  return actions
}

export const parseReference = (options: string, actions: string): GhosttyReference => ({
  ghostty: HEADER.exec(options)?.[1] ?? 'unknown',
  options: parseOptionDocs(options),
  actions: parseActionDocs(actions),
})

const keybindSeparator = (value: string): number => {
  let offset = 0
  while (offset < value.length) {
    const index = value.indexOf('=', offset)
    if (index === -1) return -1
    const next = value[index + 1]
    if (next !== '+' && next !== '=') return index
    offset = index + 1
  }
  return -1
}

export const findToken = (line: string, character: number): GhosttyToken | undefined => {
  if (line.trimStart().startsWith('#')) return undefined
  const match = KEY.exec(line)
  if (!match) return undefined

  const [prefix, indent, key] = match
  const keyEnd = indent.length + key.length
  if (character >= indent.length && character <= keyEnd) {
    return { kind: 'option', name: key, start: indent.length, end: keyEnd }
  }
  if (key !== 'keybind' || character < prefix.length) return undefined

  const value = line.slice(prefix.length)
  const separator = keybindSeparator(value)
  if (separator === -1) return undefined
  const action = ACTION_NAME.exec(value.slice(separator + 1))
  if (!action) return undefined

  const start = prefix.length + separator + 1
  const end = start + action[0].length
  if (character < start || character > end) return undefined
  return { kind: 'action', name: action[0], start, end }
}

export const describeToken = (token: GhosttyToken, reference: GhosttyReference): string | undefined => {
  const link = (url: string) => `[Ghostty ${reference.ghostty} reference](${url}#${token.name})`
  const sections = (...parts: string[]) => parts.filter(Boolean).join('\n\n')

  if (token.kind === 'action') {
    const docs = reference.actions[token.name]
    if (docs === undefined) return undefined
    return sections(`Keybind action \`${token.name}\``, docs, link(ACTIONS_URL))
  }

  const option = reference.options[token.name]
  if (!option) return undefined
  const defaultLine = option.default === undefined ? '' : `Default: \`${option.default}\``
  return sections(`### \`${token.name}\``, option.docs, defaultLine, link(OPTIONS_URL))
}
