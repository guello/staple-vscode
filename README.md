<div align="center">
  <img src="icon.png" style="width: 80px" />

# VS Code Tools

</div>

Essential Visual Studio Code utilities packaged as a single lightweight, performant extension.

## Features

- [Git Instant Refresh](#git-instant-refresh)
- [GitHub Markdown Preview](#github-markdown-preview)
- [Toggle Quotes](#toggle-quotes)
- [Sort Objects By Key](#sort-objects-by-key)
- [TOML](#toml)
- [Ghostty Syntax](#ghostty-syntax)
- [Optimize Images](#optimize-images)

### Git Instant Refresh

Refreshes the built-in Git view (Source Control changes list) as soon as a repository changes outside VS Code: GitLens actions, terminal git commands, external tools. The built-in `vscode.git` extension reacts to external `.git` changes through a hardcoded slow path (1s debounce, wait for idle, then a 5s trailing throttle) with no setting to tune it. This feature watches `.git` metadata (HEAD, index, refs, merge state) in every open repository and calls the Git API's `repository.status()` directly.

| Setting                                 | Default | Description                                  |
| --------------------------------------- | ------- | -------------------------------------------- |
| `vscodeTools.gitInstantRefresh.enabled` | `true`  | Enable the feature.                          |
| `vscodeTools.gitInstantRefresh.delay`   | `200`   | Debounce in milliseconds before the refresh. |

### GitHub Markdown Preview

Renders the built-in Markdown preview with GitHub's stylesheet. Nine GitHub themes ship with it: light and dark, their high contrast, Protanopia and Deuteranopia, and Tritanopia variants, plus dark dimmed. By default the preview follows your editor theme, and it resolves correctly under both high contrast themes.

Only the preview styling is replaced. GitHub features that change the rendered HTML, such as `:emoji:` shortcodes and `- [ ]` task lists, still need their own extensions.

| Setting                                 | Default | Description                                                                           |
| --------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| `vscodeTools.githubMarkdown.enabled`    | `true`  | Style the Markdown preview. Turning it off restores the built-in look.                |
| `vscodeTools.githubMarkdown.colorTheme` | `auto`  | `auto` follows the editor theme, `system` follows the OS, `light` and `dark` pin one. |
| `vscodeTools.githubMarkdown.lightTheme` | `light` | GitHub theme used whenever the preview resolves to light.                             |
| `vscodeTools.githubMarkdown.darkTheme`  | `dark`  | GitHub theme used whenever the preview resolves to dark.                              |

Both theme settings accept `light`, `light_high_contrast`, `light_colorblind`, `light_tritanopia`, `dark`, `dark_high_contrast`, `dark_colorblind`, `dark_tritanopia`, and `dark_dimmed`.

### Toggle Quotes

Cycles the quotes around the cursor with `cmd+'` (`ctrl+'` on Windows and Linux). Supports multiple cursors and escapes or unescapes inner quotes when cycling.

| Setting                            | Default       | Description                                                                                                                                                            |
| ---------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vscodeTools.toggleQuotes.enabled` | `true`        | Enable the command.                                                                                                                                                    |
| `vscodeTools.toggleQuotes.chars`   | `["\"", "'"]` | Characters to cycle. Entries are a character or a [begin, end] pair. Language overridable; backtick is added by default for JavaScript, TypeScript, Vue, and Markdown. |

### Sort Objects By Key

Run **VS Code Tools: Sort Objects By Key** from the Command Palette while editing a JSON file. The command reads the top-level array, lists every key found across its objects, and sorts the objects by the selected key in ascending order. Objects without that key stay at the end in their original order.

The command is available for JSON files by default. Set `vscodeTools.sortObjectsByKey.enabled` to `false` to disable it. Set `vscodeTools.sortObjectsByKey.allowNonJson` to `true` to use it in another language mode; the file must still contain valid JSON. You can assign a shortcut to `vscodeTools.sortObjectsByKey` from the Keyboard Shortcuts editor.

### TOML

TOML files, `Cargo.lock`, and `uv.lock` get syntax highlighting, comment and bracket editing, diagnostics, formatting, schema completion and validation, hover details, folding, document symbols, links, and symbol renaming. TOML fenced code blocks and `+++` frontmatter are highlighted in Markdown. The Taplo language server starts only after a TOML document is opened and stops when no TOML documents remain open.

Associate a JSON Schema by placing one of these declarations before any TOML table or value:

```toml
"$schema" = "./schema.json"
```

```toml
#:schema ./schema.json
```

The path can be relative to the TOML file or an absolute URL. Use a `./` or `../` prefix for relative paths in a `"$schema"` value. Schema catalogs, filename associations, schema pickers, and Taplo configuration files are not used. Downloaded schemas are cached in the extension's global storage. Prefer `#:schema` when a strict schema rejects unknown properties, since `"$schema"` is part of the TOML data and may need to be declared as an allowed property in the schema.

| Setting                                          | Default | Description                                              |
| ------------------------------------------------ | ------- | -------------------------------------------------------- |
| `vscodeTools.toml.enabled`                       | `true`  | Enable the TOML language server features.                |
| `vscodeTools.toml.completion.maxKeys`            | `5`     | Limit dotted keys shown in completion items.             |
| `vscodeTools.toml.schema.links`                  | `false` | Show links supplied by the active schema.                |
| `vscodeTools.toml.schema.cache.memoryExpiration` | `60`    | Expire in-memory schema entries after this many seconds. |
| `vscodeTools.toml.schema.cache.diskExpiration`   | `600`   | Refetch disk-cached schemas after this many seconds.     |
| `vscodeTools.toml.formatter.*`                   | `null`  | Override individual Taplo formatter options.             |

Formatter settings use the `vscodeTools.toml.formatter` prefix. Available keys are `alignEntries`, `alignComments`, `arrayTrailingComma`, `arrayAutoExpand`, `inlineTableExpand`, `arrayAutoCollapse`, `compactArrays`, `compactInlineTables`, `compactEntries`, `columnWidth`, `indentTables`, `indentEntries`, `indentString`, `trailingNewline`, `reorderKeys`, `reorderArrays`, `reorderInlineTables`, `allowedBlankLines`, and `crlf`. A `null` value keeps Taplo's default. The editor's tab size and spaces setting still controls indentation unless `indentString` is set.

The TOML grammar and language server are derived from [Taplo and Even Better TOML](https://github.com/tamasfe/taplo) by Ferenc Tamás (MIT).

### Ghostty Syntax

Syntax highlighting for [Ghostty](https://ghostty.org) terminal configuration files. Provides a `ghostty` language with a TextMate grammar (keys, values, comments, keybind and color literals), comment toggling, and quote pairing.

Files highlight automatically in three cases:

- The file uses the `.ghostty` extension.
- The file starts with a Ghostty modeline, for example `# vim: ft=ghostty`.
- The file is `config`, or lives in a `themes` directory, inside a `ghostty` directory. Covered locations:
  - `~/.config/ghostty/config` and `~/.config/ghostty/themes/*` (Linux, and macOS with `$XDG_CONFIG_HOME`)
  - `~/Library/Application Support/com.mitchellh.ghostty/config` and its `themes/*` (macOS)

These are recognized in the file explorer before they are opened, because the extension adds the matching globs to your user `files.associations`. This is controlled by the `vscodeTools.ghosttySyntax.autoAssociations` setting (default `true`); turning it off removes the globs the extension added and leaves any of your own untouched. The whole feature can be turned off with `vscodeTools.ghosttySyntax.enabled`.

Hex colors get a swatch and the built-in color picker, including palette entries such as `palette = 0=#1d1f21`. Editing through the picker writes the color back as `#rrggbb` (or `#rrggbbaa` when it has alpha).

For a config file kept somewhere else, associate it manually:

```jsonc
// settings.json
"files.associations": {
  "**/my-dotfiles/ghostty.conf": "ghostty"
}
```

### Optimize Images

Optimizes images with your preferred optimizer app. Right-click an image in the Explorer and choose **Optimize Image**, or right-click a folder and choose **Optimize Images in Folder**. The folder command searches recursively and opens every image it finds in one launch; if a folder holds more than `confirmThreshold` images it asks first. Most optimizer apps rewrite the files in place.

The app is launched without a shell, so file names with characters like `&` or spaces are always safe. On macOS the app is opened with `open -a <app>`, so `app` is the name shown in `/Applications`, for example `ImageOptim`. On Windows and Linux `app` must be an executable on `PATH` or a full path to one, for example `FileOptimizer.exe` or `/usr/bin/trimage`.

The feature stays hidden until you set `vscodeTools.optimizeImages.app`. With no app configured there is no menu item and no command: nothing is optimized silently.

| Setting                                          | Default                                                | Description                                                                                                                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vscodeTools.optimizeImages.app`                 | `""`                                                   | Optimizer app to open images with: an app name on macOS, an executable on Windows and Linux. Required; the feature is off until it is set. User or machine setting only, so a workspace cannot point it at an arbitrary executable. |
| `vscodeTools.optimizeImages.imageRegex`          | `\.(png\|jpe?g\|gif\|svg\|webp\|avif\|tiff?\|bmp)$`    | Case-insensitive regex matching images when optimizing a folder.                                                                                                                                                                    |
| `vscodeTools.optimizeImages.searchIgnoreFolders` | `[".git", ".svn", "node_modules", "bower_components"]` | Folder names skipped during the recursive search.                                                                                                                                                                                   |
| `vscodeTools.optimizeImages.confirmThreshold`    | `50`                                                   | Confirm before optimizing a folder with more than this many images.                                                                                                                                                                 |

**Suggested apps**

Pick an app that optimizes files in place and takes file paths passed to it, then set its name as `vscodeTools.optimizeImages.app`.

- **macOS**: [ImageOptim](https://imageoptim.com) removes metadata and losslessly compresses PNG, JPEG, and GIF. Pair it with [ImageAlpha](https://pngmini.com) for lossy PNG and [JPEGmini](https://www.jpegmini.com) for lossy JPEG. Set `"vscodeTools.optimizeImages.app": "ImageOptim"`.
- **Windows**: [FileOptimizer](https://sourceforge.net/projects/nikkhokkho/files/FileOptimizer/) covers PNG, JPEG, and GIF with lossless and lossy modes.
- **Linux**: [Trimage](https://trimage.org) does lossless PNG and JPEG compression with metadata removal.

## Development

```sh
pnpm install
pnpm run deploy
```

`pnpm run deploy` checks the project, bundles the extension into `dist/`, packages the vsix, and installs it into VS Code. Reload the VS Code window after installing. `pnpm run check` runs TypeScript, Oxlint, Oxfmt's check mode, and Knip in parallel. Use `pnpm run fix` to apply safe lint fixes and format the repository. Run `pnpm run build` or `pnpm run package` when you only need those steps.

Every long-running command lives in `scripts/` and runs through Node's TypeScript support, so `package.json` only holds the entry points. `scripts/build.mts` bundles the extension with esbuild and, in parallel, writes `dist/features/github-markdown/markdown.css` and `themes.css` by pulling the current GitHub stylesheets with [generate-github-markdown-css](https://github.com/sindresorhus/generate-github-markdown-css). That second step needs network access on a cold cache, since the package scrapes github.com and calls the public Markdown API; results are cached under `node_modules/.cache` for a day. The hand-written preview stylesheets live in `media/github-markdown/`.

`@taplo/lsp` inlines its 26 MB WebAssembly module as a base64 string, which esbuild would otherwise carry into the bundle. `scripts/build.mts` decodes that string at build time, writes it to `dist/features/toml/taplo.wasm`, and rewrites the loader to read the file from disk, so `server.js` stays around 18 KB instead of 34 MB. The plugin fails the build if the blob is missing or does not start with the wasm magic bytes, which is the signal that a `@taplo/lsp` upgrade changed its bundle layout.

`pnpm test` bundles every `src/**/*.test.ts` with esbuild and runs each bundle on Node's test runner. The bundle replaces the `vscode` module with an empty stub so feature modules that import it can still be unit tested.
