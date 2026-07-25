declare module 'generate-github-markdown-css' {
  interface GithubMarkdownCssOptions {
    light?: string
    dark?: string
    list?: boolean
    preserveVariables?: boolean
    onlyVariables?: boolean
    onlyStyles?: boolean
    useFixture?: boolean
    rootSelector?: string
    transparentBackground?: boolean
  }

  const githubMarkdownCss: (options?: GithubMarkdownCssOptions) => Promise<string>

  export default githubMarkdownCss
}
