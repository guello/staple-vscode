import * as vscode from 'vscode'

interface GitRepository {
  readonly rootUri: vscode.Uri
  status(): Promise<void>
}

interface GitApi {
  readonly repositories: GitRepository[]
  readonly onDidOpenRepository: vscode.Event<GitRepository>
  readonly onDidCloseRepository: vscode.Event<GitRepository>
}

interface GitExtensionExports {
  getAPI(version: 1): GitApi
}

const SECTION = 'staple.instantGitRefresh'
const METADATA_GLOB = '.git/{HEAD,ORIG_HEAD,FETCH_HEAD,MERGE_HEAD,CHERRY_PICK_HEAD,REBASE_HEAD,index,packed-refs}'
const REFS_GLOB = '.git/refs/**'

const isEnabled = (scope: vscode.ConfigurationScope | null): boolean =>
  vscode.workspace.getConfiguration(SECTION, scope).get('enabled', true)

const delayFor = (scope: vscode.ConfigurationScope): number =>
  Math.max(0, vscode.workspace.getConfiguration(SECTION, scope).get('delay', 200))

const trackRepository = (repository: GitRepository): vscode.Disposable => {
  const watchers = [METADATA_GLOB, REFS_GLOB].map(glob =>
    vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(repository.rootUri, glob))
  )

  let timer: ReturnType<typeof setTimeout> | undefined
  let running = false
  let pending = false

  const refresh = async (): Promise<void> => {
    if (running) {
      pending = true
      return
    }
    running = true
    try {
      await repository.status()
    } catch {}
    running = false
    if (pending) {
      pending = false
      schedule()
    }
  }

  const schedule = (): void => {
    clearTimeout(timer)
    timer = setTimeout(() => void refresh(), delayFor(repository.rootUri))
  }

  for (const watcher of watchers) {
    watcher.onDidChange(schedule)
    watcher.onDidCreate(schedule)
    watcher.onDidDelete(schedule)
  }

  return new vscode.Disposable(() => {
    clearTimeout(timer)
    for (const watcher of watchers) watcher.dispose()
  })
}

export const activateInstantGitRefresh = async (context: vscode.ExtensionContext): Promise<void> => {
  const gitExtension = vscode.extensions.getExtension<GitExtensionExports>('vscode.git')
  if (!gitExtension) return

  const git = (await gitExtension.activate()).getAPI(1)
  const trackers = new Map<string, vscode.Disposable>()

  const open = (repository: GitRepository): void => {
    const key = repository.rootUri.toString()
    if (trackers.has(key) || !isEnabled(repository.rootUri)) return
    trackers.set(key, trackRepository(repository))
  }

  const close = (repository: GitRepository): void => {
    const key = repository.rootUri.toString()
    trackers.get(key)?.dispose()
    trackers.delete(key)
  }

  const rebuild = (): void => {
    for (const tracker of trackers.values()) tracker.dispose()
    trackers.clear()
    for (const repository of git.repositories) open(repository)
  }

  for (const repository of git.repositories) open(repository)

  context.subscriptions.push(
    git.onDidOpenRepository(open),
    git.onDidCloseRepository(close),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(SECTION)) rebuild()
    }),
    new vscode.Disposable(() => {
      for (const tracker of trackers.values()) tracker.dispose()
    })
  )
}
