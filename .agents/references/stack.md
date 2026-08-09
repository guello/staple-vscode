# Stack decisions

Why the toolchain looks the way it does, and what would justify changing it. Read this before proposing a different bundler, test runner or type package, and before raising a major version. Verified against the installed tree in August 2026.

## Contents

- [Locked stack](#locked-stack): what is in use and why
- [Version constraints](#version-constraints): the couplings a bump has to respect
- [Editor baseline](#editor-baseline): what the extension targets
- [Not adopted](#not-adopted): what was considered and left out

## Locked stack

- **Build**: esbuild driven by `scripts/build.mts`, run by Node's native TypeScript support. Three entry points, `outbase: src`, minified, `vscode` external. There is no bundler config file and no plugin ecosystem in play beyond the one local `taplo-wasm` plugin.
- **Output format**: CJS. The extension host loads `main` as CommonJS, and the `taplo-wasm` plugin rewrites the wasm loader to `require('node:fs')` and `__dirname`, both of which only exist there. The source is ESM throughout and only the bundle is CJS.
- **Language**: TypeScript with `strict`, ES2022 target, `bundler` module resolution and `noEmit`, because esbuild does the emitting. `allowImportingTsExtensions` is on so `scripts/*.mts` can import each other by full filename, which is what Node's type stripping requires.
- **Tests**: `node:test` and `node:assert/strict`, bundled by `scripts/test.mts` with `vscode` stubbed as an empty object. The stub is deliberately useless: it means anything importing the editor API cannot be unit tested, which forces testable logic into pure modules.
- **Gates**: oxfmt, oxlint with type-aware rules through `oxlint-tsgolint`, knip, and `tsc --noEmit`, all four in parallel. No ESLint, no Prettier, no separate test framework.
- **Runtime dependencies**: `@taplo/lsp` and `vscode-languageclient`, both reachable only through the TOML feature and both loaded lazily. Everything else is a devDependency.

## Version constraints

Four couplings break quietly if a bump ignores them.

- `@types/vscode` must be less than or equal to `engines.vscode`. It is pinned with `~` rather than `^` because a caret would let `pnpm update --latest` drift the types years past the declared floor, and the code would then compile against APIs that are missing in the oldest editor the extension claims to support. `vsce` does not catch every case.
- `vscode-languageclient` sets the floor. Version 10 declares `engines.vscode: ^1.91.0`, which is why the extension declares `1.91` rather than something older. Raising the client raises the floor, and both `engines.vscode` and `@types/vscode` move together.
- `esbuild` `target` tracks the Node runtime the oldest supported VS Code embeds. It is `node20` today. It moves only when `engines.vscode` moves.
- `@types/node` majors change strictness on the Node API surface without any Node upgrade. Version 26 made `process.disconnect` optional, which is correct, since it exists only on a process that has an IPC channel, and `src/features/toml/server.ts` calls it through `?.()` for that reason.

pnpm enforces a minimum release age, so `pnpm update --latest` deliberately stops one version short of a package published in the last day. That gap is the policy working, not a stale cache. Never force the newer version with an explicit `pnpm add <pkg>@<version>`: pnpm records a permanent `minimumReleaseAgeExclude` entry in `pnpm-workspace.yaml` for it and every one of its platform packages, which commits a supply-chain exemption to the repository. Wait for the window to pass instead.

TypeScript 7 is in use and the gates pass on it. If `tsc --noEmit` or the type-aware oxlint rules misbehave on a future 7.x, pin `^5.9` and record why here rather than disabling the rule.

## Editor baseline

`engines.vscode` is `^1.91.0`, set by `vscode-languageclient` 10 and nothing else. No API in the source requires it. Raise it only alongside a dependency or an API that forces it, and check the `@since` on the API before assuming it does.

The extension is not web-compatible and does not declare a browser entry point. `optimize-images.ts` shells out through `node:child_process`, `toml/client.ts` spawns a Node process, and the Taplo wasm module is read from disk. Adding a web build means carving all three out, not adding a field.

## Not adopted

- **A bundler framework.** No webpack, no rollup, no tsup, no `@vscode/test-cli`. The two build scripts are around 40 lines each and port almost verbatim to and from staple-chrome, which is the point: both repositories share one build shape.
- **An integration test runner.** `@vscode/test-electron` or `@vscode/test-cli` would let tests drive a real editor, which is the one gap the current gates leave. It has not been added because nothing is written against it yet; add the dependency when the first test exists, not before.
- **`@types/markdown-it`.** `src/features/markdown/markdown-it.ts` declares the structural subset the plugin actually touches. A real type package would pull a transitive tree for four interfaces.
- **A CI workflow.** There is no `.github/workflows/`. The git hooks are the only gate, which means a push from a clone that never ran `pnpm install` is ungated. Adding one is the obvious next hardening step and would run `pnpm run ci` on push and pull request.
