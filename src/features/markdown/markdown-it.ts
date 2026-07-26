export interface Token {
  type: string
  content: string
  level: number
  children: Token[] | null
  attrGet(name: string): string | null
  attrJoin(name: string, value: string): void
  attrSet(name: string, value: string): void
}

export interface CoreState {
  tokens: Token[]
  Token: new (type: string, tag: string, nesting: number) => Token
}

export interface MarkdownIt {
  core: {
    ruler: {
      push(name: string, rule: (state: CoreState) => void): void
    }
  }
  renderer: {
    render(...args: unknown[]): string
  }
}
