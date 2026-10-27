# Release

How a version leaves this repository, and what is still unfinished for the first one. Check the current state with `git tag`, `gh repo view --json visibility` and the Marketplace URL below before assuming anything here is still true.

## Cutting a version

1. Bump `version` in `package.json`. It is the only place a version lives: `pnpm deploy` reads it back through `$npm_package_version` to install the file `vsce` just named.
2. `pnpm package`. It runs `pnpm run ci`, then `vscode:prepublish` rebuilds `dist/`, then `vsce package --no-dependencies` writes `staple-vscode-<version>.vsix` at the repository root. The vsix is gitignored through `*.vsix`.
3. Read the file list `vsce` prints. `.vscodeignore` is an allowlist, so a newly shipped directory is missing rather than extra, and the gates cannot see it.
4. `pnpm deploy` installs that vsix into the local editor. Reload the window, then exercise each feature by hand. The gates never touch the VS Code API, so a green `pnpm run ci` says nothing about whether the extension works.
5. Commit with the repository's conventional style (`chore: release vX.Y.Z`), tag `vX.Y.Z`, push the tag, then create the GitHub release with the vsix attached.

`--no-dependencies` is required, not an optimization. `vsce` otherwise walks the pnpm store through symlinks and either bloats the package or fails outright; the two runtime dependencies are already inside the esbuild bundle.

Commits are signed through git's `ssh-keygen` signer. Never disable signing. Never run a history-writing command without being asked for it in the current turn.

## Still open for v1

Verified in August 2026:

- `github.com/guello/staple-vscode` exists and is public, `origin` is set, and `main` tracks it.
- No `v0.1.0` tag and no GitHub release yet.
- Not on the Marketplace: `marketplace.visualstudio.com/items?itemName=guello.staple-vscode` returns 404.
- No CI workflow, so nothing verifies a pull request from outside a local clone.

## Marketplace publishing

Manual the first time and not scriptable from here, because it needs an Azure DevOps organization and a personal access token that cannot be minted headlessly.

1. Create an Azure DevOps organization on the account that will own the publisher, then a personal access token scoped to Marketplace: Manage, with All accessible organizations selected. A token scoped to one organization silently fails to publish.
2. Create the `guello` publisher at `marketplace.visualstudio.com/manage`. The `publisher` field in `package.json` already claims that id and has to match exactly.
3. `pnpm exec vsce login guello`, then `pnpm exec vsce publish --no-dependencies` for a version already bumped, or `vsce publish <major|minor|patch>` to have it bump and tag.
4. The listing renders `README.md` and the icon from `package.json`. Relative image paths are rewritten against the repository, so a new asset has to be pushed before publishing or it shows as broken.
5. `THIRD_PARTY_NOTICES.md` ships in the vsix and covers the vendored Ghostty grammar and the Taplo derivation. Any new vendored file gets an entry there in the same commit.
6. After the listing is live, add the Marketplace link to the README install section.

Open VSX is a separate registry with its own token and its own `ovsx publish` step. It is not set up and is only worth doing if someone asks for VSCodium support.
