import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { type RpcMessage, TaploLsp } from '@taplo/lsp'

const SCHEMA_STORE_CATALOGS = new Set([
  'https://json.schemastore.org/api/json/catalog.json',
  'https://www.schemastore.org/api/json/catalog.json',
])
const SCHEMA_ANNOTATION_KEYS = new Set([
  '$comment',
  'default',
  'deprecated',
  'description',
  'examples',
  'readOnly',
  'title',
  'writeOnly',
])
const EMPTY_CATALOG_DATA_URL = 'data:application/json,%7B%22schemas%22%3A%5B%5D%7D'

let taploPromise: Promise<TaploLsp> | undefined
let shutdownRequested = false
const fetchFromNetwork = globalThis.fetch

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const rewriteSingleReferenceAllOf = (value: unknown, state: { changed: boolean }): unknown => {
  if (Array.isArray(value)) return value.map(item => rewriteSingleReferenceAllOf(item, state))
  if (!isJsonObject(value)) return value

  const rewritten = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, rewriteSingleReferenceAllOf(item, state)])
  )
  const compositionKeys = ['allOf', 'oneOf', 'anyOf'].filter(
    key => rewritten[key] !== undefined && rewritten[key] !== null
  )
  const allOf = rewritten.allOf
  const hasNonAnnotationSibling = Object.keys(rewritten).some(
    key => key !== 'allOf' && !SCHEMA_ANNOTATION_KEYS.has(key)
  )

  if (
    compositionKeys.length !== 1 ||
    compositionKeys[0] !== 'allOf' ||
    hasNonAnnotationSibling ||
    (rewritten.properties !== undefined && rewritten.properties !== null) ||
    !Array.isArray(allOf) ||
    allOf.length !== 1 ||
    !isJsonObject(allOf[0]) ||
    typeof allOf[0].$ref !== 'string'
  ) {
    return rewritten
  }

  const siblings = { ...rewritten }
  delete siblings.allOf
  state.changed = true
  return { ...allOf[0], ...siblings }
}

const sanitizeSchemaJson = (content: string) => {
  try {
    const state = { changed: false }
    const value = rewriteSingleReferenceAllOf(JSON.parse(content), state)
    return state.changed ? JSON.stringify(value) : content
  } catch (error: unknown) {
    if (error instanceof SyntaxError) return content
    throw error
  }
}

const sanitizeSchemaResponse = async (response: Response) => {
  const content = await response.clone().text()
  const sanitized = sanitizeSchemaJson(content)
  if (sanitized === content) return response

  const headers = new Headers(response.headers)
  headers.delete('content-encoding')
  headers.delete('content-length')
  const result = new Response(sanitized, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
  Object.defineProperty(result, 'url', { value: response.url })
  return result
}

const requestUrl = (input: string | URL | Request) => {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

const fetchWithoutCatalogs: typeof fetch = async (input, init) => {
  const response = SCHEMA_STORE_CATALOGS.has(requestUrl(input))
    ? await fetchFromNetwork(EMPTY_CATALOG_DATA_URL)
    : await fetchFromNetwork(input, init)
  return sanitizeSchemaResponse(response)
}

globalThis.fetch = fetchWithoutCatalogs

const environmentVariables = () =>
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)

const filePathFromUrl = (url: string) => {
  const decoded = decodeURIComponent(url).slice('file://'.length)
  return process.platform === 'win32' && decoded.startsWith('/') ? decoded.slice(1) : decoded
}

const readSchemaFile = async (filePath: string) => {
  const content = await readFile(filePath)
  const text = content.toString('utf8')
  const sanitized = sanitizeSchemaJson(text)
  return sanitized === text ? content : Buffer.from(sanitized)
}

const findConfigFile = (): string | undefined => void 0

const createTaplo = () =>
  TaploLsp.initialize(
    {
      cwd: () => process.cwd(),
      envVar: name => process.env[name],
      envVars: environmentVariables,
      fetch: {
        fetch: fetchWithoutCatalogs,
        Headers,
        Request,
        Response,
      },
      findConfigFile,
      glob: () => [],
      isAbsolute: filePath => path.isAbsolute(filePath),
      now: () => new Date(),
      readFile: readSchemaFile,
      stderr: process.stderr,
      stdErrAtty: () => process.stderr.isTTY,
      stdin: process.stdin,
      stdout: process.stdout,
      urlToFilePath: filePathFromUrl,
      writeFile: (filePath, content) => writeFile(filePath, content),
    },
    {
      onMessage: message => process.send?.(message),
    }
  )

const getTaplo = () => {
  taploPromise ??= createTaplo()
  return taploPromise
}

const isRpcMessage = (value: unknown): value is RpcMessage =>
  typeof value === 'object' && value !== null && 'jsonrpc' in value && value.jsonrpc === '2.0'

const handleMessage = async (value: unknown) => {
  if (!isRpcMessage(value)) return

  if (value.method === 'shutdown' && value.id !== undefined) {
    shutdownRequested = true
    // oxlint-disable-next-line unicorn/no-null
    process.send?.({ id: value.id, jsonrpc: '2.0', result: null })
    return
  }

  if (value.method === 'exit') {
    if (taploPromise) (await taploPromise).dispose()
    process.exitCode = 0
    process.disconnect?.()
    return
  }

  if (shutdownRequested) return

  const taplo = await getTaplo()
  taplo.send(value)
}

const dispatchMessage = async (value: unknown) => {
  try {
    await handleMessage(value)
  } catch (error: unknown) {
    console.error(error)
    process.exitCode = 1
    process.disconnect?.()
  }
}

process.on('message', (value: unknown) => {
  void dispatchMessage(value)
})
