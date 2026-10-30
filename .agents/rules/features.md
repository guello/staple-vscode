---
description: 'Use when editing a feature under src/features. The contract every feature follows, and the deliberate behaviors in each one that look overbuilt but fix a real defect and must not be simplified away.'
applyTo: 'src/features/**'
paths:
  - 'src/features/**'
---

# Feature invariants

Every feature exports `activate<Name>(context: vscode.ExtensionContext)`, is called once from `src/extension.ts`, and owns four things: its disposables on `context.subscriptions`, its settings under `staple.<feature>`, an `onDidChangeConfiguration` listener filtered with `affectsConfiguration`, and an early return when its `enabled` setting is off.

Settings are read at the point of use, never captured at activation. Where a setting is scoped per resource or per language, pass the scope: `getConfiguration(SECTION, uri)` in `instant-git-refresh.ts` and `optimize-images.ts`, `{ uri, languageId }` in `toggle-quotes.ts`. Dropping the scope silently ignores workspace and language overrides.

Only pure sibling modules are unit testable, because `scripts/test.mts` replaces `vscode` with an empty object. `task-lists.ts` and `sort-objects-by-key.ts` are the two that carry tests. New logic belongs in that shape or it ships untested.

The guards below are fixes for defects that actually occurred, several of them in the extensions these features replace. Do not remove one without reproducing the case it covers.

## Git Instant Refresh

Replaces waiting on `vscode.git`, whose external-change path is a hardcoded 1s debounce, an idle wait and a 5s trailing throttle with no setting to tune it.

- Two watchers per repository: the metadata glob (`HEAD`, `ORIG_HEAD`, `FETCH_HEAD`, `MERGE_HEAD`, `CHERRY_PICK_HEAD`, `REBASE_HEAD`, `index`, `packed-refs`) and `.git/refs/**`. Watching `.git/**` instead floods on object writes during a fetch.
- `refresh()` holds an in-flight flag and a pending flag. `repository.status()` can outlast the debounce, and re-entering it drops the later change. The pending path reschedules rather than awaiting.
- `repository.status()` rejections are swallowed. A repository mid-rebase throws, and an unhandled rejection in a watcher callback would surface as an extension error toast on every keystroke.
- The tracker map is keyed by `rootUri.toString()` and rebuilt wholesale on a configuration change, because `delay` is per resource and a submodule can resolve differently from its parent.
- Activation returns early when `vscode.git` is absent. It is declared in `extensionDependencies`, but the API is still fetched defensively.

## Ghostty Syntax

- `syncAssociations()` writes to the user's global `files.associations` and is the only place in the extension that touches foreign settings. It adds a glob only when the key is absent, and removes one only when the value is still `ghostty`. A user who repointed a glob keeps their value, and turning `autoAssociations` off reverts only what the extension added.
- It reads the global value through `inspect()`, never the merged `get()`. The merged value includes workspace and folder keys, and writing it back would copy them into user settings.
- The `files.update` rejection is swallowed. The setting is unwritable in some remote and restricted profiles, and failing there must not break the rest of activation.
- The color provider skips a line whose first non-blank character is `#`, so a commented-out theme line gets no swatch. The hex regex still has to run on the rest of the line, since `palette = 0=#1d1f21` puts the color mid-line.
- Presentations are written back as `#rrggbb`, widening to `#rrggbbaa` only when alpha is below 1. Ghostty accepts both, and always emitting alpha would rewrite every color a user picks.

## Optimize Images

- The app is launched through `execFile`, never a shell. Paths reach it as argv entries, so a file named with `&`, a space or a quote is safe by construction. Do not switch to `exec` or build a command string.
- `staple.optimizeImages.app` is `machine` scope on purpose: a workspace setting pointing at an arbitrary executable would be remote code execution on folder open. Keep the scope when editing the setting.
- The feature stays invisible until `app` is set. The menu `when` clauses and the command palette entries all gate on `config.staple.optimizeImages.app`, so nothing is optimized silently.
- The recursive walk tracks visited `realpath` values. A symlink loop under a project folder would otherwise recurse forever.
- Folder runs open every image in one launch and confirm past `confirmThreshold`. Most optimizers rewrite in place, so a mistaken folder pick is destructive.

## Toggle Quotes

- `isEscaped()` counts preceding backslashes and treats an odd count as escaped, so `"a \" b"` is one string rather than two. A simple `indexOf` scan reintroduces that bug.
- Symmetric pairs match greedily in order (`0-1`, `2-3`), asymmetric pairs match the nearest opener at or before the cursor and the first closer after it. The innermost match wins when several enclose the cursor.
- `convertBody()` unescapes the outgoing delimiter and escapes the incoming one, and only for single-character symmetric pairs. Applying it to a multi-character or asymmetric pair would corrupt the body.
- Cycling is `(index + 1) % pairs.length` over the configured list, so the order in `chars` is the cycle order. Fewer than two pairs is a no-op.

## Sort Objects By Key

- Numbers are compared through a parsed `{ negative, digits, magnitude, zero }` record built with `bigint`, not `Number`. Sorting ids past `Number.MAX_SAFE_INTEGER` by float loses precision and reorders equal-looking values.
- The sort rewrites the original text spans and reuses the raw source for each object, so comments, spacing and number formatting survive. Do not reimplement it as `JSON.parse` then `JSON.stringify`.
- Objects missing the selected key stay last in their original order, which makes the sort stable and reversible.
- Invalid structure throws with a message the command surfaces. The document is left untouched.

## Markdown

Covered separately in `markdown-preview.md`, because the preview spans the feature, the generator script and `media/markdown/`.

## TOML

- `index.ts` is a serialized state machine, not a pair of start and stop calls. `requestSynchronization()` sets a dirty flag and reuses the in-flight promise, and `synchronize()` loops while the flag is set. Open, close and configuration events arrive faster than the server starts, and starting a second client leaks a process.
- The client is loaded with a runtime `import()` of the built `client.js` URL. A static import would pull `vscode-languageclient` into `extension.js` and load it for every user, including those who never open a TOML file.
- `stopToml` is module scope so `deactivate()` can await the same state machine. VS Code kills the host if `deactivate()` returns before the child exits.
- `server.ts` calls `process.send?.()` and `process.disconnect?.()`. Both exist only when the process has an IPC channel, and the server is also runnable without one.
- Semantic tokens are disabled in both the middleware and the Taplo configuration. VS Code's TextMate grammar already colors TOML, and the two disagree.
- Taplo config file discovery is off and catalogs are empty. Schemas come from the in-document `$schema` or `#:schema` declaration only, which keeps behavior identical across machines.
