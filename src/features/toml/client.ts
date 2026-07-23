import * as vscode from 'vscode'

import { LanguageClient, type LanguageClientOptions, TransportKind } from 'vscode-languageclient/node'

const SECTION = 'vscodeTools.toml'
const FORMATTER_SETTINGS = [
  'alignEntries',
  'alignComments',
  'arrayTrailingComma',
  'arrayAutoExpand',
  'inlineTableExpand',
  'arrayAutoCollapse',
  'compactArrays',
  'compactInlineTables',
  'compactEntries',
  'columnWidth',
  'indentTables',
  'indentEntries',
  'indentString',
  'trailingNewline',
  'reorderKeys',
  'reorderArrays',
  'reorderInlineTables',
  'allowedBlankLines',
  'crlf',
] as const

const formatterConfiguration = (configuration: vscode.WorkspaceConfiguration) => {
  const formatter: Record<string, boolean | number | string> = {}

  for (const setting of FORMATTER_SETTINGS) {
    const value = configuration.get(`formatter.${setting}`)
    if (typeof value !== 'boolean' && typeof value !== 'number' && typeof value !== 'string') continue
    formatter[setting] = value
  }

  return formatter
}

const taploConfiguration = (resource: vscode.Uri | undefined) => {
  const configuration = vscode.workspace.getConfiguration(SECTION, resource)

  return {
    taplo: {
      configFile: {
        enabled: false,
      },
    },
    schema: {
      enabled: true,
      associations: {},
      catalogs: [],
      links: configuration.get('schema.links', false),
      cache: {
        memoryExpiration: configuration.get('schema.cache.memoryExpiration', 60),
        diskExpiration: configuration.get('schema.cache.diskExpiration', 600),
      },
    },
    completion: {
      maxKeys: configuration.get('completion.maxKeys', 5),
    },
    syntax: {
      semanticTokens: false,
    },
    formatter: formatterConfiguration(configuration),
    rules: [],
  }
}

export const createTomlClient = async (context: vscode.ExtensionContext) => {
  await vscode.workspace.fs.createDirectory(context.globalStorageUri)

  const serverModule = vscode.Uri.joinPath(context.extensionUri, 'dist', 'features', 'toml', 'server.js').fsPath
  const server = {
    module: serverModule,
    transport: TransportKind.ipc,
  }
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'toml', scheme: 'file' }],
    initializationOptions: {
      cachePath: context.globalStorageUri.fsPath,
      configurationSection: SECTION,
    },
    middleware: {
      provideDocumentSemanticTokens: () => void 0,
      workspace: {
        configuration: params =>
          params.items.map(item => taploConfiguration(item.scopeUri ? vscode.Uri.parse(item.scopeUri) : undefined)),
      },
    },
  }

  return new LanguageClient('vscodeTools.toml', 'VS Code Tools: TOML', { run: server, debug: server }, clientOptions)
}
