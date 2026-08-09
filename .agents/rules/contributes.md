---
description: 'Use when editing package.json: the contribution points that must agree with the source and with each other, which of those links nothing checks, the settings scope policy, and the packaging fields.'
applyTo: 'package.json'
paths:
  - 'package.json'
---

# Manifest and contributions

`package.json` is both the npm manifest and the VS Code extension manifest. Its `contributes` block is the extension's entire declarative surface, and almost nothing in it is verified against the source: `tsc` never reads it, oxlint never reads it, and knip only checks the dependency lists. A typo here fails at runtime in a user's editor, so every link below is checked by hand or not at all.

`oxfmt` runs with `sortPackageJson: false`, so key order is deliberate and hand-maintained. Do not reorder, and do not let another tool rewrite the file.

## What has to agree

| Declaration                             | Must match                                                                     | Checked by |
| --------------------------------------- | ------------------------------------------------------------------------------ | ---------- |
| `contributes.commands[].command`        | the id passed to `registerCommand` or `registerTextEditorCommand`              | nobody     |
| `contributes.configuration.properties`  | the section and key each feature reads, and the default the code falls back to | nobody     |
| `when` and `enablement` clauses         | the setting keys they name through `config.`                                   | nobody     |
| `contributes.markdown.previewStyles`    | files under `dist/features/markdown/` and `media/markdown/`, in load order     | nobody     |
| `contributes.languages[].configuration` | files under `languages/`                                                       | nobody     |
| `contributes.grammars[].path`           | files under `languages/`                                                       | nobody     |
| `main`                                  | the esbuild output path in `scripts/build.mts`                                 | nobody     |
| every shipped path above                | an allow line in `.vscodeignore`                                               | nobody     |

`.vscodeignore` excludes `**` and then allows back. A new shipped directory that is not allowed there is missing from the vsix while everything still builds and tests green. Confirm with `pnpm package` and read the file list it prints.

A setting default declared here and a different default in the `get(key, fallback)` call is a real bug: the declared one drives the settings UI, the code one drives behavior when the key is absent, and users see two answers. Where the code reads with no inline fallback (`mode`, `lightTheme`, `darkTheme`, `chars`, `checkboxes`), a validator downstream supplies it, so the declared default has to match that validator instead.

## Settings scope

Scope is a security boundary, not a formality. A workspace can set anything scoped `resource` or `window`, which means an untrusted folder can set it.

| Scope                  | Used for                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `machine`              | `optimizeImages.app` only. A workspace pointing it at an executable would be remote code execution on folder open. |
| `application`          | `ghosttySyntax.*`, because the feature writes to global `files.associations`.                                      |
| `language-overridable` | `toggleQuotes.*`, so a language can carry its own quote cycle.                                                     |
| `window`               | `markdown.*`, which the preview webview reads once per window.                                                     |
| `resource`             | everything else.                                                                                                   |

Never widen `machine` or `application` to reach a per-project value without saying in the commit what a hostile workspace could then do.

## Menus, palette and keybindings

`staple.optimizeFolderImages` is registered with `"when": "false"` under `commandPalette`. That is the documented way to keep a context-menu-only command out of the palette, where it would have no folder argument. Any new command that needs an argument from its invocation site gets the same treatment.

Menu `when` clauses do the visibility work and the command handler still validates its argument, because a keybinding or another extension can invoke a command that no menu is showing.

`contributes.keybindings` carries both `key` and `mac`. Adding one without checking the VS Code default keybindings list is how a shortcut silently loses to a built-in.

## Packaging fields

- `engines.vscode` is the compatibility floor and `@types/vscode` must never exceed it. `vscode-languageclient` 10 is what currently sets the floor at `1.91`.
- `extensionDependencies` lists `vscode.git`, which is what makes the Git API available to `instant-git-refresh.ts`.
- `vscode:prepublish` runs `pnpm build`, so `vsce` always packages a fresh `dist/`. `pnpm package` gates on `pnpm run ci` before that.
- `version` is not tagged automatically. See `.agents/references/release.md`.
