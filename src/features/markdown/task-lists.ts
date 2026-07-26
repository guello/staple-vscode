import { type CoreState, type MarkdownIt, type Token } from './markdown-it'

const TASK_STATES = ['unchecked', 'checked', 'indeterminate', 'cancelled'] as const

type TaskState = (typeof TASK_STATES)[number]

const MARKER_LENGTH = 3
const TRAILING = /^\s/

export interface TaskListOptions {
  enabled: boolean
  states: Record<string, TaskState>
}

const isTaskState = (value: unknown): value is TaskState => TASK_STATES.includes(value as TaskState)

export const resolveStates = (value: unknown) => {
  const states: Record<string, TaskState> = {}
  if (typeof value !== 'object' || value === null) return states
  for (const [symbol, state] of Object.entries(value)) {
    if (symbol.length === 1 && isTaskState(state)) states[symbol] = state
  }
  return states
}

const parentIndex = (tokens: Token[], index: number) => {
  const level = tokens[index].level - 1
  for (let i = index - 1; i >= 0; i--) if (tokens[i].level === level) return i
  return -1
}

const addClass = (token: Token, value: string) => {
  if (token.attrGet('class')?.split(' ').includes(value)) return
  token.attrJoin('class', value)
}

const html = (Token: CoreState['Token'], content: string) => {
  const token = new Token('html_inline', '', 0)
  token.content = content
  return token
}

const checkbox = (state: TaskState) =>
  `<input class="task-list-item-checkbox" type="checkbox" data-task-state="${state}" disabled${state === 'checked' ? ' checked' : ''}>`

const strip = (value: string) => {
  const rest = value.slice(MARKER_LENGTH)
  return rest.startsWith(' ') ? rest.slice(1) : rest
}

export const taskLists = (md: MarkdownIt, resolve: () => TaskListOptions) => {
  md.core.ruler.push('vscodeToolsTaskLists', state => {
    const options = resolve()
    if (!options.enabled) return

    const { tokens } = state
    for (let index = 2; index < tokens.length; index++) {
      const inline = tokens[index]
      if (inline.type !== 'inline' || tokens[index - 1].type !== 'paragraph_open') continue

      const item = tokens[index - 2]
      if (item.type !== 'list_item_open') continue

      const [first] = inline.children ?? []
      if (first?.type !== 'text') continue

      const { content } = first
      if (!content.startsWith('[') || content[2] !== ']') continue

      const taskState = options.states[content[1]]
      if (!taskState) continue

      const rest = content.slice(MARKER_LENGTH)
      if (rest !== '' && !TRAILING.test(rest)) continue

      const marker = content.slice(0, MARKER_LENGTH)
      const spaced = rest.startsWith(' ')
      first.content = strip(content)
      if (inline.content.startsWith(marker)) inline.content = strip(inline.content)

      inline.children?.unshift(
        html(state.Token, `${checkbox(taskState)}${spaced ? ' ' : ''}`),
        html(state.Token, '<span class="task-list-item-label">')
      )
      inline.children?.push(html(state.Token, '</span>'))

      addClass(item, 'task-list-item')
      item.attrSet('data-task-state', taskState)

      const parent = parentIndex(tokens, index - 2)
      if (parent >= 0) addClass(tokens[parent], 'contains-task-list')
    }
  })
}
