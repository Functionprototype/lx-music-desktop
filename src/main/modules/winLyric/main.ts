/**
 * @file 桌面歌词窗口管理模块
 * @description 负责创建、关闭、控制桌面歌词窗口，处理窗口事件
 */

import path from 'node:path'
import { BrowserWindow } from 'electron'
import { debounce, getPlatform, isLinux, isWin } from '@common/utils'
import { initWindowSize } from './utils'
import { mainSend } from '@common/mainIpc'
import { encodePath } from '@common/utils/electron'

// require('./event')
// require('./rendererEvent')

// 桌面歌词窗口实例
let browserWindow: Electron.BrowserWindow | null = null
// 标记窗口边界是否正在更新中
let isWinBoundsUpdateing = false

/**
 * 保存窗口边界配置
 * @description 使用防抖处理，延迟保存窗口位置和大小信息到全局配置
 * @param config 要保存的配置对象
 */
const saveBoundsConfig = debounce((config: Partial<LX.AppSetting>) => {
  // 更新全局配置
  global.lx.event_app.update_config(config)
  // 重置窗口边界更新标志
  if (isWinBoundsUpdateing) isWinBoundsUpdateing = false
}, 500) // 500毫秒的防抖延迟

/**
 * 注册窗口事件处理函数
 * @description 为桌面歌词窗口注册各种事件的处理函数
 */
const winEvent = () => {
  if (!browserWindow) return

  // browserWindow.on('close', () => {
  //   if (global.lx.appSetting['desktopLyric.enable'] && !global.lx.mainWindowClosed) {
  //     browserWindow = null
  //     global.lx.event_app.update_config({ 'desktopLyric.enable': false })
  //   }
  // })

  // 窗口关闭事件处理：清除窗口引用
  browserWindow.on('closed', () => {
    browserWindow = null
  })

  // 窗口移动事件处理
  browserWindow.on('move', () => {
    // bounds = browserWindow.getBounds()
    // console.log('move', isWinBoundsUpdateing)
    if (isWinBoundsUpdateing) {
      // 如果是主动调整窗口位置，保存新的位置信息到配置
      const bounds = browserWindow!.getBounds()
      saveBoundsConfig({
        'desktopLyric.x': bounds.x,
        'desktopLyric.y': bounds.y,
        'desktopLyric.width': bounds.width,
        'desktopLyric.height': bounds.height,
      })
    } else if (isWin) { // Linux 不允许将窗口设置出屏幕之外，MacOS未知，故只在Windows下执行强制设置
      // 非主动调整窗口触发的窗口位置变化将重置回设置值
      browserWindow!.setBounds({
        x: global.lx.appSetting['desktopLyric.x'] ?? 0,
        y: global.lx.appSetting['desktopLyric.y'] ?? 0,
        width: global.lx.appSetting['desktopLyric.width'],
        height: global.lx.appSetting['desktopLyric.height'],
      })
    }
  })

  // 窗口大小调整事件处理
  browserWindow.on('resize', () => {
    // bounds = browserWindow.getBounds()
    // console.log(bounds)
    // 标记为主动调整窗口
    isWinBoundsUpdateing = true
    // 获取新的窗口边界并保存到配置
    const bounds = browserWindow!.getBounds()
    saveBoundsConfig({
      'desktopLyric.x': bounds.x,
      'desktopLyric.y': bounds.y,
      'desktopLyric.width': bounds.width,
      'desktopLyric.height': bounds.height,
    })
  })

  // browserWindow.on('restore', () => {
  //   browserWindow.webContents.send('restore')
  // })
  // browserWindow.on('focus', () => {
  //   browserWindow.webContents.send('focus')
  // })

  // 窗口准备显示事件处理
  browserWindow.once('ready-to-show', () => {
    // 显示窗口
    showWindow()
    // 如果设置了锁定状态，则忽略鼠标事件
    if (global.lx.appSetting['desktopLyric.isLock']) {
      browserWindow!.setIgnoreMouseEvents(true, { forward: !isLinux && global.lx.appSetting['desktopLyric.isHoverHide'] })
    }
    // linux下每次重开时貌似要重新设置置顶
    // if (isLinux && global.lx.appSetting['desktopLyric.isAlwaysOnTop']) {
    //   browserWindow!.setAlwaysOnTop(global.lx.appSetting['desktopLyric.isAlwaysOnTop'], 'screen-saver')
    // }
    // 如果设置了置顶且开启了循环刷新置顶，则启动循环
    if (global.lx.appSetting['desktopLyric.isAlwaysOnTop'] && global.lx.appSetting['desktopLyric.isAlwaysOnTopLoop']) alwaysOnTopTools.startLoop()
    // 取消窗口焦点，避免干扰用户操作
    browserWindow!.blur()
  })
}

/**
 * 创建桌面歌词窗口
 * @description 根据配置创建桌面歌词窗口，设置窗口属性和事件处理
 */
export const createWindow = () => {
  // 先关闭已存在的窗口
  closeWindow()
  // 如果没有工作区大小信息，则无法创建窗口
  if (!global.envParams.workAreaSize) return
  
  // 从配置中获取窗口位置和大小
  let x = global.lx.appSetting['desktopLyric.x']
  let y = global.lx.appSetting['desktopLyric.y']
  let width = global.lx.appSetting['desktopLyric.width']
  let height = global.lx.appSetting['desktopLyric.height']
  // 获取窗口其他属性
  let isAlwaysOnTop = global.lx.appSetting['desktopLyric.isAlwaysOnTop']
  // let isLockScreen = global.lx.appSetting['desktopLyric.isLockScreen']
  let isShowTaskbar = global.lx.appSetting['desktopLyric.isShowTaskbar']
  // let { width: screenWidth, height: screenHeight } = global.envParams.workAreaSize
  
  // 初始化窗口大小和位置，确保在屏幕范围内
  const winSize = initWindowSize(x, y, width, height)
  // 更新配置中的窗口位置和大小
  global.lx.event_app.update_config({
    'desktopLyric.x': winSize.x,
    'desktopLyric.y': winSize.y,
    'desktopLyric.width': winSize.width,
    'desktopLyric.height': winSize.height,
  })

  // 获取主题相关信息
  const { shouldUseDarkColors, theme } = global.lx.theme

  /**
   * 初始化窗口选项
   * @description 配置桌面歌词窗口的各种属性
   */
  browserWindow = new BrowserWindow({
    height: winSize.height,
    width: winSize.width,
    x: winSize.x,
    y: winSize.y,
    minWidth: 380, // 最小宽度限制
    minHeight: 80, // 最小高度限制
    useContentSize: true, // 使用内容区域大小
    frame: false, // 无边框窗口
    transparent: true, // 透明背景
    hasShadow: false, // 不显示阴影
    // enableRemoteModule: false,
    // icon: join(global.__static, isWin ? 'icons/256x256.ico' : 'icons/512x512.png'),
    resizable: isWin, // 仅在Windows系统下允许调整大小
    minimizable: false, // 不允许最小化
    maximizable: false, // 不允许最大化
    fullscreenable: false, // 不允许全屏
    show: false, // 创建后不立即显示
    alwaysOnTop: isAlwaysOnTop, // 是否置顶
    skipTaskbar: !isShowTaskbar, // 是否在任务栏显示
    webPreferences: {
      contextIsolation: false, // 不隔离上下文
      webSecurity: false, // 禁用web安全限制
      sandbox: false, // 禁用沙箱
      nodeIntegration: true, // 启用Node集成
      enableWebSQL: false, // 禁用WebSQL
      webgl: false, // 禁用WebGL
      spellcheck: false, // 禁用拼写检查器
    },
  })
  // 根据环境确定窗口加载的URL（开发环境使用本地服务器，生产环境使用文件路径）
  const winURL = process.env.NODE_ENV !== 'production' ? 'http://localhost:9081/lyric.html' : `file://${path.join(encodePath(__dirname), 'lyric.html')}`
  // 加载URL并传递操作系统、暗色模式和主题信息
  void browserWindow.loadURL(winURL + `?os=${getPlatform()}&dark=${shouldUseDarkColors}&theme=${encodeURIComponent(JSON.stringify(theme))}`)

  // 注册窗口事件处理
  winEvent()
  // browserWindow.webContents.openDevTools()
  // 触发桌面歌词窗口创建完成事件
  global.lx.event_app.desktop_lyric_window_created(browserWindow)
}

/**
 * 检查桌面歌词窗口是否存在
 * @returns 窗口是否存在
 */
export const isExistWindow = (): boolean => !!browserWindow

/**
 * 关闭桌面歌词窗口
 */
export const closeWindow = () => {
  if (!browserWindow) return
  browserWindow.close()
}

/**
 * 显示桌面歌词窗口
 */
export const showWindow = () => {
  if (!browserWindow) return
  browserWindow.show()
}

/**
 * 向桌面歌词窗口发送事件
 * @param name 事件名称
 * @param params 事件参数
 */
export const sendEvent = <T = any>(name: string, params?: T) => {
  if (!browserWindow) return
  mainSend(browserWindow, name, params)
}

/**
 * 获取桌面歌词窗口的边界信息
 * @returns 窗口边界矩形
 */
export const getBounds = (): Electron.Rectangle => {
  if (!browserWindow) throw new Error('window is not available')
  return browserWindow.getBounds()
}

/**
 * 设置桌面歌词窗口的边界
 * @param bounds 窗口边界矩形
 */
export const setBounds = (bounds: Electron.Rectangle) => {
  if (!browserWindow) return
  isWinBoundsUpdateing = true
  browserWindow.setBounds(bounds)
}

/**
 * 设置是否忽略鼠标事件
 * @param ignore 是否忽略鼠标事件
 * @param options 忽略鼠标事件的选项
 */
export const setIgnoreMouseEvents = (ignore: boolean, options?: Electron.IgnoreMouseEventsOptions) => {
  if (!browserWindow) return
  browserWindow.setIgnoreMouseEvents(ignore, options)
}

/**
 * 设置是否在任务栏显示
 * @param skip 是否跳过任务栏显示
 */
export const setSkipTaskbar = (skip: boolean) => {
  if (!browserWindow) return
  browserWindow.setSkipTaskbar(skip)
}

/**
 * 设置窗口是否置顶
 * @param flag 是否置顶
 * @param level 置顶级别
 * @param relativeLevel 相对级别
 */
export const setAlwaysOnTop = (flag: boolean, level?: 'normal' | 'floating' | 'torn-off-menu' | 'modal-panel' | 'main-menu' | 'status' | 'pop-up-menu' | 'screen-saver' | undefined, relativeLevel?: number | undefined) => {
  if (!browserWindow) return
  browserWindow.setAlwaysOnTop(flag, level, relativeLevel)
}

/**
 * 获取窗口的主框架
 * @returns 窗口主框架或null
 */
export const getMainFrame = (): Electron.WebFrameMain | null => {
  if (!browserWindow) return null
  return browserWindow.webContents.mainFrame
}

/**
 * 窗口置顶工具接口
 * @description 提供窗口置顶相关的功能，包括设置置顶状态和循环刷新置顶
 */
interface AlwaysOnTopTools {
  /** 循环定时器 */
  timeout: NodeJS.Timeout | null
  /** 设置窗口置顶状态 */
  setAlwaysOnTop: (isLoop: boolean) => void
  /** 启动置顶循环刷新 */
  startLoop: () => void
  /** 清除置顶循环刷新 */
  clearLoop: () => void
}

/**
 * 窗口置顶工具实现
 * @description 提供窗口置顶状态管理和循环刷新功能，解决某些情况下窗口无法保持置顶的问题
 */
export const alwaysOnTopTools: AlwaysOnTopTools = {
  // 循环定时器引用
  timeout: null,
  
  /**
   * 设置窗口置顶状态
   * @param isLoop 是否启用循环刷新置顶
   */
  setAlwaysOnTop(isLoop) {
    // 先清除现有循环
    this.clearLoop()
    // 设置窗口置顶
    setAlwaysOnTop(global.lx.appSetting['desktopLyric.isAlwaysOnTop'], 'screen-saver')
    // 如果需要循环刷新，则启动循环
    if (isLoop) this.startLoop()
  },
  
  /**
   * 启动置顶循环刷新
   * @description 每秒钟刷新一次窗口置顶状态，确保窗口始终保持在最前面
   */
  startLoop() {
    // 先清除现有循环
    this.clearLoop()
    // 设置定时器，每秒刷新一次置顶状态
    this.timeout = setInterval(() => {
      // 如果窗口已关闭，则清除循环
      if (!isExistWindow()) {
        this.clearLoop()
        return
      }
      // 刷新窗口置顶状态
      setAlwaysOnTop(true, 'screen-saver')
    }, 1000) // 1秒间隔
  },
  
  /**
   * 清除置顶循环刷新
   */
  clearLoop() {
    if (!this.timeout) return
    clearInterval(this.timeout)
    this.timeout = null
  },
}
