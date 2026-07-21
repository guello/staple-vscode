import { execFile } from 'node:child_process'
import { realpath } from 'node:fs/promises'
import { promisify } from 'node:util'

import * as vscode from 'vscode'

const execFileAsync = promisify(execFile)

const SECTION = 'vscodeTools.optimizeImages'
const DEFAULT_IMAGE_REGEX = '\\.(png|jpe?g|gif|svg|webp|avif|tiff?|bmp)$'
const DEFAULT_IGNORE_FOLDERS = ['.git', '.svn', 'node_modules', 'bower_components']

interface Config {
  app: string
  imageRegex: RegExp
  ignoreFolders: string[]
  confirmThreshold: number
}

const readConfig = (scope: vscode.ConfigurationScope): Config => {
  const config = vscode.workspace.getConfiguration(SECTION, scope)
  return {
    app: config.get('app', '').trim(),
    imageRegex: new RegExp(config.get('imageRegex', DEFAULT_IMAGE_REGEX), 'i'),
    ignoreFolders: config.get('searchIgnoreFolders', DEFAULT_IGNORE_FOLDERS),
    confirmThreshold: config.get('confirmThreshold', 50),
  }
}

const isImage = (uri: vscode.Uri, imageRegex: RegExp): boolean => imageRegex.test(uri.path)

const collectImages = async (folder: vscode.Uri, imageRegex: RegExp, ignoreFolders: string[]) => {
  const images: vscode.Uri[] = []
  const visited = new Set<string>()
  const walk = async (dir: vscode.Uri): Promise<void> => {
    const real = await realpath(dir.fsPath).catch(() => dir.fsPath)
    if (visited.has(real)) return
    visited.add(real)

    let entries: [string, vscode.FileType][]
    try {
      entries = await vscode.workspace.fs.readDirectory(dir)
    } catch {
      return
    }
    for (const [name, type] of entries) {
      const child = vscode.Uri.joinPath(dir, name)
      if ((type & vscode.FileType.Directory) !== 0) {
        if (ignoreFolders.includes(name)) continue
        await walk(child)
        continue
      }
      if ((type & vscode.FileType.File) !== 0 && isImage(child, imageRegex)) images.push(child)
    }
  }
  await walk(folder)
  return images
}

const launch = async (app: string, files: vscode.Uri[]) => {
  const paths = files.map(file => file.fsPath)
  if (process.platform === 'darwin') {
    await execFileAsync('open', ['-a', app, ...paths])
    return
  }
  await execFileAsync(app, paths)
}

const resolveFile = (arg: unknown) => {
  if (arg instanceof vscode.Uri) return arg

  const tabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input
  if (tabInput instanceof vscode.TabInputText || tabInput instanceof vscode.TabInputCustom) {
    return tabInput.uri
  }

  return vscode.window.activeTextEditor?.document.uri
}

const basename = (uri: vscode.Uri) => uri.path.slice(uri.path.lastIndexOf('/') + 1)

const noAppConfigured = () => {
  void vscode.window.showErrorMessage(
    'Optimize Image: set an app name in the "vscodeTools.optimizeImages.app" setting first.'
  )
}

const optimizeImage = async (arg: unknown) => {
  const uri = resolveFile(arg)
  if (!uri) {
    void vscode.window.showErrorMessage('Optimize Image: no image file selected.')
    return
  }

  const config = readConfig(uri)
  if (!config.app) {
    noAppConfigured()
    return
  }
  if (!isImage(uri, config.imageRegex)) {
    void vscode.window.showErrorMessage(`Optimize Image: ${basename(uri)} is not a supported image.`)
    return
  }

  try {
    await launch(config.app, [uri])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    void vscode.window.showErrorMessage(`Optimize Image failed: ${message}`)
  }
}

const optimizeFolder = async (arg: unknown): Promise<void> => {
  if (!(arg instanceof vscode.Uri)) {
    void vscode.window.showErrorMessage('Optimize Images: no folder selected.')
    return
  }

  const config = readConfig(arg)
  if (!config.app) {
    noAppConfigured()
    return
  }

  try {
    const images = await collectImages(arg, config.imageRegex, config.ignoreFolders)
    if (images.length === 0) {
      void vscode.window.showInformationMessage(`Optimize Images: no images found in ${basename(arg)}.`)
      return
    }

    if (images.length > config.confirmThreshold) {
      const choice = await vscode.window.showWarningMessage(
        `Optimize ${images.length} images in ${basename(arg)} with ${config.app}?`,
        { modal: true },
        'Optimize'
      )
      if (choice !== 'Optimize') return
    }

    await launch(config.app, images)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    void vscode.window.showErrorMessage(`Optimize Images failed: ${message}`)
  }
}

export function activateOptimizeImage(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('vscodeTools.optimizeImage', optimizeImage),
    vscode.commands.registerCommand('vscodeTools.optimizeFolderImages', optimizeFolder)
  )
}
