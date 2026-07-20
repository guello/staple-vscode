<div align="center">
  <img src="icon.png" style="width: 5.5rem" />

  # VS Code Tools
</div>

Essential Visual Studio Code utilities packaged as a single lightweight and performant extension.

## Features

### Git Instant Refresh

Refreshes the built-in Git view (Source Control changes list) as soon as a repository changes outside VS Code: GitLens actions, terminal git commands, external tools. The built-in `vscode.git` extension reacts to external `.git` changes through a hardcoded slow path (1s debounce, wait for idle, then a 5s trailing throttle) with no setting to tune it. This feature watches `.git` metadata (HEAD, index, refs, merge state) in every open repository and calls the Git API's `repository.status()` directly.

| Setting                                 | Default | Description                                  |
| --------------------------------------- | ------- | -------------------------------------------- |
| `vscodeTools.gitInstantRefresh.enabled` | `true`  | Enable the feature.                          |
| `vscodeTools.gitInstantRefresh.delay`   | `200`   | Debounce in milliseconds before the refresh. |

### Toggle Quotes

Cycles the quotes around the cursor with `cmd+'` (`ctrl+'` on Windows and Linux), replacing the [vscode-toggle-quotes](https://marketplace.visualstudio.com/items?itemName=BriteSnow.vscode-toggle-quotes) extension. Supports multiple cursors and escapes or unescapes inner quotes when cycling.

| Setting                            | Default       | Description                                                                                                                                                            |
| ---------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vscodeTools.toggleQuotes.enabled` | `true`        | Enable the command.                                                                                                                                                    |
| `vscodeTools.toggleQuotes.chars`   | `["\"", "'"]` | Characters to cycle. Entries are a character or a [begin, end] pair. Language overridable; backtick is added by default for JavaScript, TypeScript, Vue, and Markdown. |

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

### Optimize Image

Optimizes images with your preferred optimizer app. Right-click an image in the Explorer and choose **Optimize Image**, or right-click a folder and choose **Optimize Images in Folder**. The folder command searches recursively and opens every image it finds in one launch; if a folder holds more than `confirmThreshold` images it asks first. Most optimizer apps rewrite the files in place.

The app is launched without a shell, so file names with characters like `&` or spaces are always safe. On macOS the app is opened with `open -a <app>`, so `app` is the name shown in `/Applications`, for example `ImageOptim`. On Windows and Linux `app` must be an executable on `PATH` or a full path to one, for example `FileOptimizer.exe` or `/usr/bin/trimage`.

The feature stays hidden until you set `vscodeTools.optimizeImages.app`. With no app configured there is no menu item and no command: nothing is optimized silently.

| Setting                                        | Default                                         | Description                                                          |
| ---------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| `vscodeTools.optimizeImages.app`                | `""`                                            | Optimizer app to open images with: an app name on macOS, an executable on Windows and Linux. Required; the feature is off until it is set. User or machine setting only, so a workspace cannot point it at an arbitrary executable. |
| `vscodeTools.optimizeImages.imageRegex`         | `\.(png\|jpe?g\|gif\|svg\|webp\|avif\|tiff?\|bmp)$` | Case-insensitive regex matching images when optimizing a folder.  |
| `vscodeTools.optimizeImages.searchIgnoreFolders`| `[".git", ".svn", "node_modules", "bower_components"]` | Folder names skipped during the recursive search.           |
| `vscodeTools.optimizeImages.confirmThreshold`   | `50`                                            | Confirm before optimizing a folder with more than this many images. |

#### Suggested apps

Pick an app that optimizes files in place and takes file paths passed to it, then set its name as `vscodeTools.optimizeImages.app`.

- **macOS**: [ImageOptim](https://imageoptim.com) removes metadata and losslessly compresses PNG, JPEG, and GIF. Pair it with [ImageAlpha](https://pngmini.com) for lossy PNG and [JPEGmini](https://www.jpegmini.com) for lossy JPEG. Set `"vscodeTools.optimizeImages.app": "ImageOptim"`.
- **Windows**: [FileOptimizer](https://sourceforge.net/projects/nikkhokkho/files/FileOptimizer/) covers PNG, JPEG, and GIF with lossless and lossy modes.
- **Linux**: [Trimage](https://trimage.org) does lossless PNG and JPEG compression with metadata removal.

## Development

```sh
pnpm install
pnpm run deploy
```

`pnpm run deploy` typechecks with tsc, bundles `src/` into `extension.js` with esbuild, packages the vsix, and installs it into VS Code. Reload the VS Code window after installing. Use `pnpm run check`, `pnpm run build`, or `pnpm run package` for the individual steps.
