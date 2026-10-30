# Staple

Visual Studio Code extension collecting small editor utilities that would otherwise be seven separate installs. It is the origin of the standard [staple-chrome](https://github.com/guello/staple-chrome) follows: minimal dependencies, hand-written build scripts, oxfmt plus oxlint plus knip plus tsc as the only gates, one folder per feature with an `enabled` setting, conventional commits.

## Commands

Node 24.18.0 through nodenv (`.node-version`), pnpm 11.17.0 through Corepack (`packageManager`). Long commands live in `scripts/` as `.mts` files, run by Node directly through its TypeScript support, so `package.json` holds only the entry points.

| Command                    | What it runs                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm check`               | oxfmt check, knip, oxlint and `tsc --noEmit` in parallel. Green before every commit.      |
| `pnpm test`                | esbuild bundles every `src/**/*.test.ts` and runs each bundle on `node:test`.             |
| `pnpm run ci`              | `pnpm check` then `pnpm test`. The `run` is required, see below.                          |
| `pnpm build`               | esbuild bundles the three entry points into `dist/` and writes the generated preview CSS. |
| `pnpm watch`               | Like `pnpm build`, but unminified with inline source maps, and rebuilds on every save.    |
| `pnpm package`             | `pnpm run ci`, then `vsce package --no-dependencies` into `staple-vscode-<version>.vsix`. |
| `pnpm deploy`              | `pnpm package`, then installs the vsix into VS Code. Reload the window afterwards.        |
| `pnpm fix`                 | Lint fixes plus formatting. Use it instead of hand-fixing.                                |
| `pnpm generate:ghostty`    | Rewrites `languages/ghostty/reference/` from the installed Ghostty. Run after an upgrade. |
| `pnpm check-commit <file>` | commitlint over a commit message file. The `commit-msg` hook calls it.                    |

`ci` is the one script that has to be invoked as `pnpm run ci`. `pnpm ci` is a pnpm builtin, an alias of `clean-install`, so the bare form silently deletes `node_modules` and reinstalls instead of running the gates. Every other script name here is free of a builtin and either form works.

`.githooks/` holds the hooks: `pre-commit` runs `pnpm run check`, `commit-msg` runs commitlint, `pre-push` runs `pnpm run ci`. `pnpm install` points git at the directory through the `prepare` script.

## Architecture

`src/extension.ts` is the only module VS Code loads. Its `activate()` calls one `activate<Name>(context)` per feature and returns the markdown API, which `contributes.markdown.markdownItPlugins` in `package.json` hands to the built-in preview. `deactivate()` exists only to stop the TOML server.

A feature is one file under `src/features/`, or a folder when it needs more than one module. A folder's `index.ts` owns every `vscode.*` call and its siblings hold the decisions as pure functions with a colocated `*.test.ts`. Only those pure modules are testable: `scripts/test.mts` stubs the `vscode` module with an empty object, so anything importing it cannot be unit tested. When a change adds logic, it goes in a pure module or it goes untested.

Every feature registers its disposables on `context.subscriptions`, reads settings under its own `staple.<feature>` section, and reacts to `onDidChangeConfiguration` filtered by `affectsConfiguration`. Settings are read at use time rather than cached at activation, so a change takes effect without a reload.

TOML is the one out-of-process feature and the reason there are three esbuild entry points. `src/features/toml/index.ts` runs in the extension host and owns a state machine that starts the client only once a TOML document is open and stops it when the last one closes. It reaches `client.ts` through a runtime `import()` of the built file's URL, so `vscode-languageclient` never loads for a user who opens no TOML file. `client.ts` spawns `server.js` as a separate Node process over IPC, and `server.ts` proxies that channel to Taplo's wasm module.

`scripts/build.mts` emits CJS for `node20` with `vscode` external, and runs `scripts/generate-github-markdown.mts` in parallel to produce the preview stylesheets. Everything under `dist/` is generated and gitignored; never edit it or commit it.

## Hard rules

- Two runtime dependencies, `@taplo/lsp` and `vscode-languageclient`, both only for TOML. Everything else ships as vanilla TypeScript against the `vscode` API. A new runtime dependency needs a reason the platform cannot cover.
- `@types/vscode` must never exceed `engines.vscode`, or code compiles against APIs missing from the oldest editor the extension claims to support. It is pinned with `~` for that reason; raise both together and only for an API that forces it.
- `.vscodeignore` is an allowlist: `**` excluded, then `!` for what ships. A new shipped directory has to be added there or it silently misses the vsix.
- Every setting a feature reads is declared in `contributes.configuration` with the same default the code falls back to. A default that disagrees with the code is a bug, not a preference.
- Never write to a user's settings without a setting that governs it. `ghostty-syntax/index.ts` is the only feature that does, it touches only globs it added itself, and `staple.ghosttySyntax.autoAssociations` turns it off and reverts them.
- oxfmt, oxlint, knip and tsc own formatting and style. Do not restate their rules in review, and do not hand-fix what `pnpm fix` fixes.
- Conventional commits, enforced by commitlint through the `commit-msg` hook. Commits are signed; never disable signing.
- No em or en dash in a committed file. No machine-specific absolute path in a committed file.

## Adding a feature

1. `src/features/<name>.ts`, or `src/features/<name>/index.ts` when it needs siblings, exporting `activate<Name>(context)`. Call it from `src/extension.ts`.
2. `contributes.configuration.properties` in `package.json`: `staple.<name>.enabled` plus the feature's other keys, each with a `scope` and the same default the code uses.
3. Commands, menus and keybindings in `contributes`, with `when` and `enablement` clauses gating on the settings. Nothing typechecks a command id against `registerCommand`, so a typo shows up only at runtime.
4. A README section with a settings table.
5. A new entry point also goes in `entry` in `knip.json`, or knip reports the file as unused.

## Verifying behavior

`pnpm check` and `pnpm test` cover the pure logic only. Nothing in the gates touches the VS Code API, so a green `pnpm run ci` says nothing about whether a feature works.

Anything touching `vscode.*` needs the extension loaded. For the edit loop, run `pnpm watch` and open an Extension Development Host on the working tree with `code --extensionDevelopmentPath="$PWD"`, then press `cmd+r` in that window after each rebuild. It overrides the installed copy in that window only. There is no hot reload: the extension host must restart to pick up new code. For a final check in your own windows, `pnpm deploy` then reload the window. Check the Extension Host output channel for activation errors, since a throw inside `activate()` is otherwise silent.

The preview, the TOML server and the Git refresh each need their own check. Open a markdown preview under a light and a dark theme; open and close the last TOML file to confirm the server starts and stops; run a git command in a terminal and watch the Source Control view update.

## Read next

Rules also load on their path glob in Claude Code; other agents read them from here.

| File                                | When                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `.agents/rules/features.md`         | Editing `src/features/`. Deliberate behaviors that must not be simplified away. |
| `.agents/rules/markdown-preview.md` | Editing the markdown feature, its generator or `media/markdown/`.               |
| `.agents/rules/contributes.md`      | Editing `package.json`. What has to agree, and what nothing checks.             |
| `.agents/references/stack.md`       | Changing the build, the test runner, the types or the editor baseline.          |
| `.agents/references/release.md`     | Packaging, tagging, publishing, and where the release stands.                   |
