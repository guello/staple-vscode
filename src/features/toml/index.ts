import * as vscode from 'vscode'

interface TomlLanguageClient {
  start(): Promise<void>
  stop(): Promise<void>
}

interface TomlClientModule {
  createTomlClient(context: vscode.ExtensionContext): Promise<TomlLanguageClient>
}

const SECTION = 'vscodeTools.toml'
const LANGUAGE_ID = 'toml'

let stopToml: (() => Promise<void>) | undefined

const hasOpenTomlDocument = () => vscode.workspace.textDocuments.some(document => document.languageId === LANGUAGE_ID)

const isEnabled = () => vscode.workspace.getConfiguration(SECTION).get('enabled', true)

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

export const activateToml = (context: vscode.ExtensionContext): void => {
  let client: TomlLanguageClient | undefined
  let disposed = false
  let needsSynchronization = true
  let restartRequested = false
  let synchronization: Promise<void> | undefined

  const stopClient = async () => {
    if (!client) return

    const current = client
    client = undefined
    await current.stop()
  }

  const synchronize = async () => {
    while (needsSynchronization) {
      needsSynchronization = false

      try {
        if (restartRequested) {
          restartRequested = false
          await stopClient()
        }

        if (disposed || !isEnabled() || !hasOpenTomlDocument()) {
          await stopClient()
          continue
        }

        if (client) continue

        const clientModuleUrl = vscode.Uri.joinPath(
          context.extensionUri,
          'dist',
          'features',
          'toml',
          'client.js'
        ).toString()
        const clientModule = (await import(clientModuleUrl)) as TomlClientModule & {
          default?: TomlClientModule
        }
        const tomlClientModule = clientModule.default ?? clientModule
        const nextClient = await tomlClientModule.createTomlClient(context)
        client = nextClient
        await nextClient.start()
      } catch (error: unknown) {
        client = undefined
        void vscode.window.showErrorMessage(`VS Code Tools could not start TOML support: ${errorMessage(error)}`)
      }
    }

    synchronization = undefined
  }

  const requestSynchronization = (restart = false) => {
    needsSynchronization = true
    restartRequested ||= restart
    synchronization ??= synchronize()
    return synchronization
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(document => {
      if (document.languageId === LANGUAGE_ID) void requestSynchronization()
    }),
    vscode.workspace.onDidCloseTextDocument(document => {
      if (document.languageId === LANGUAGE_ID) void requestSynchronization()
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(SECTION)) void requestSynchronization(true)
    })
  )

  void requestSynchronization()

  stopToml = async () => {
    disposed = true
    await requestSynchronization()
  }
}

export const deactivateToml = async (): Promise<void> => {
  await stopToml?.()
  stopToml = undefined
}
