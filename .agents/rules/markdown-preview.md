---
description: 'Use when editing the markdown preview: src/features/markdown, media/markdown or the generator script. Which stylesheets are generated, why theme resolution happens in CSS rather than TypeScript, and the markdown-it contract VS Code imposes.'
applyTo: 'src/features/markdown/**, media/markdown/**, scripts/generate-github-markdown.mts'
paths:
  - 'src/features/markdown/**'
  - 'media/markdown/**'
  - 'scripts/generate-github-markdown.mts'
---

# Markdown preview

The preview spans three places that have to agree: the markdown-it plugin in `src/features/markdown/`, the generated stylesheets under `dist/features/markdown/`, and the hand-written ones in `media/markdown/`. `contributes.markdown.previewStyles` in `package.json` lists all five in load order, generated first.

`dist/features/markdown/markdown.css` and `themes.css` are written by `scripts/generate-github-markdown.mts` on every build and carry a do-not-edit header. Edit the generator, never the output. Hand-written rules go in `media/markdown/`.

Generation calls `generate-github-markdown-css`, which scrapes github.com and the public Markdown API, so a cold cache needs network. Results are cached under `node_modules/.cache` for a day. A build that fails here on a plane is the cache expiring, not a code change.

## Why the themes resolve in CSS

Inside a webview, `prefers-color-scheme` follows the operating system rather than the editor theme, so the extension host cannot know what `system` mode should resolve to. The generator therefore emits every combination as a selector instead of letting TypeScript pick one:

- `mode: light` and `mode: dark` pin a theme outright.
- `mode: auto` keys off the `.vscode-light`, `.vscode-dark` and `.vscode-high-contrast` classes VS Code puts on the preview body. The dark selector excludes `.vscode-high-contrast-light`, which also carries `.vscode-high-contrast`.
- `mode: system` keys off `@media (prefers-color-scheme: ...)`.

`markdown.css` is wrapped in `@container style(--markdown-theme: github)` and `themes.css` sets that property to `github` or `default` on the wrapper. That is what lets the `default` theme fall through to VS Code's own preview styling without shipping a second stylesheet. Anything added to `markdown.css` inherits the gate; anything that must apply under `default` too belongs in `media/markdown/`.

The generator rewrites every `rem` to `px` at 16px. VS Code's preview root is 14px, so leaving `rem` in scales the whole GitHub stylesheet down. It also drops rules whose selector contains `:is()`, which the upstream package emits empty and which no browser matches.

`splitVariables()` and `withoutDeadRules()` throw when the upstream stylesheet shape changes. That failure is the signal that `generate-github-markdown-css` moved, and the fix is in the generator, not a downstream override.

## The markdown-it contract

VS Code owns the markdown-it instance and hands it to `extendMarkdownIt` once per preview engine, so nothing can be re-registered later. `src/features/markdown/markdown-it.ts` declares the structural subset actually used; there is no `@types/markdown-it` dependency and adding one to reach a wider API is a dependency to justify, not a convenience.

Both the task-list rule and the render wrapper therefore read configuration through a closure evaluated per render, not captured at registration. That is what makes a settings change take effect on the refresh that `onDidChangeConfiguration` triggers through `markdown.preview.refresh`.

- The core ruler rule matches only `list_item_open`, `paragraph_open`, `inline` in sequence with a leading `[x]` text token, and requires the character after the marker to be whitespace or end of content. Loosening either check turns `[note]` prose into a checkbox.
- `resolveStates()` accepts single characters mapped to a known state and drops everything else, so a malformed user setting degrades to fewer checkboxes rather than throwing inside the renderer.
- The checkbox is emitted as `html_inline` tokens wrapping the label in `.task-list-item-label`, with `data-task-state` on both the input and the list item. `media/markdown/task-lists.css` styles from those attributes, so changing an attribute name means changing both files.
- The input is always `disabled`. The preview is not an editor and a clickable box would not write back.

Another installed extension that renders task lists parses `[ ]` first and its markup wins. The stylesheet still applies to it, which is why the styling keys off GitHub's class names as well as ours.
