/**
 * userApi/main.ts
 * 用户自定义API窗口管理模块
 * 负责创建、关闭和管理用户API的浏览器窗口，处理窗口事件和代理设置
 */

import { mainSend } from '@common/mainIpc'
import { BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'node:path'
import { openDevTools as handleOpenDevTools } from '@main/utils'
import USER_API_RENDERER_EVENT_NAME from './rendererEvent/name'
import { getScript } from './utils'

// 用户API窗口实例
let browserWindow: Electron.BrowserWindow | null = null

// 缓存HTML内容和目录路径，避免重复读取
let html: string | null = null
let dir: string | null = null

// 需要拦截的窗口事件列表，防止安全问题
const denyEvents = [
  'will-navigate',
  'will-redirect',
  'will-attach-webview',
  'will-prevent-unload',
  'media-started-playing',
] as const


/**
 * 获取代理设置
 * 优先使用应用设置中的代理，其次使用命令行参数中的代理
 * @returns 代理配置对象，包含host和port
 */
export const getProxy = () => {
  if (global.lx.appSetting['network.proxy.enable'] && global.lx.appSetting['network.proxy.host']) {
    return {
      host: global.lx.appSetting['network.proxy.host'],
      port: global.lx.appSetting['network.proxy.port'],
    }
  }
  const envProxy = envParams.cmdParams['proxy-server']
  if (envProxy) {
    if (envProxy && typeof envProxy == 'string') {
      const [host, port = ''] = envProxy.split(':')
      return {
        host,
        port,
      }
    }
  }
  return {
    host: '',
    port: '',
  }
}

/**
 * 处理代理设置更新
 * 当代理相关配置变更时，通知渲染进程更新代理设置
 * @param keys 更新的配置键名数组
 */
const handleUpdateProxy = (keys: Array<keyof LX.AppSetting>) => {
  if (keys.includes('network.proxy.enable') || (global.lx.appSetting['network.proxy.enable'] && keys.some(k => k.startsWith('network.proxy.')))) {
    sendEvent(USER_API_RENDERER_EVENT_NAME.proxyUpdate, getProxy())
  }
}

/**
 * 注册窗口事件监听
 * 主要处理窗口关闭事件，清理窗口引用
 */
const winEvent = () => {
  if (!browserWindow) return
  browserWindow.on('closed', () => {
    browserWindow = null
  })
}

/**
 * 创建用户API窗口
 * 创建一个隐藏的、安全限制的浏览器窗口用于执行用户API脚本
 * @param userApi 用户API信息对象
 */
export const createWindow = async(userApi: LX.UserApi.UserApiInfo) => {
  await closeWindow()
  dir ??= process.env.NODE_ENV !== 'production' ? webpackUserApiPath : path.join(__dirname, 'userApi')

  if (!html) {
    // eslint-disable-next-line require-atomic-updates
    html = await fs.promises.readFile(path.join(dir, 'renderer/user-api.html'), 'utf8')
  }
  const preloadUrl = process.env.NODE_ENV !== 'production'
    ? `${path.join(__dirname, '../dist/user-api-preload.js')}`
    : `${path.join(__dirname, 'user-api-preload.js')}`
  // console.log(preloadUrl)

  /**
   * 初始化窗口选项
   * 设置严格的安全限制，禁用大部分浏览器功能
   */
  browserWindow = new BrowserWindow({
    // enableRemoteModule: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      // worldSafeExecuteJavaScript: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      sandbox: false,

      spellcheck: false,
      autoplayPolicy: 'document-user-activation-required',
      enableWebSQL: false,
      disableDialogs: true,
      // nativeWindowOpen: false,
      webgl: false,
      images: false,

      preload: preloadUrl,
    },
  })

  // 拦截所有导航和重定向事件，防止安全问题
  for (const eventName of denyEvents) {
    // @ts-expect-error
    browserWindow.webContents.on(eventName, (event: Electron.Event) => {
      event.preventDefault()
    })
  }
  
  // 禁用所有权限请求
  browserWindow.webContents.session.setPermissionRequestHandler((webContents, permission, resolve) => {
    if (webContents === browserWindow?.webContents) {
      resolve(false)
      return
    }
    resolve(true)
  })
  
  // 禁止打开新窗口
  browserWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  winEvent()

  // 加载HTML内容
  await browserWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(html))

  // 窗口准备好后初始化环境
  browserWindow.on('ready-to-show', async() => {
    global.lx.event_app.on('updated_config', handleUpdateProxy)
    sendEvent(USER_API_RENDERER_EVENT_NAME.initEnv, { ...userApi, script: await getScript(userApi.id), proxy: getProxy() })
  })
}

/**
 * 关闭用户API窗口
 * 清理会话数据并销毁窗口
 */
export const closeWindow = async() => {
  global.lx.event_app.off('updated_config', handleUpdateProxy)
  if (!browserWindow) return
  await Promise.all([
    browserWindow.webContents.session.clearAuthCache(),
    browserWindow.webContents.session.clearStorageData(),
    browserWindow.webContents.session.clearCache(),
  ])
  browserWindow?.destroy()
  browserWindow = null
}

/**
 * 向用户API窗口发送事件
 * @param name 事件名称
 * @param params 事件参数
 */
export const sendEvent = <T = any>(name: string, params?: T) => {
  if (!browserWindow) return
  mainSend(browserWindow, name, params)
}

/**
 * 打开开发者工具
 * 用于调试用户API
 */
export const openDevTools = () => {
  if (!browserWindow) return
  handleOpenDevTools(browserWindow.webContents)
}
