/**
 * winMain/main.ts
 * 主窗口管理模块
 * 负责创建、配置和管理应用程序的主窗口，处理窗口事件和状态变化
 */

// 导入Electron相关模块，用于创建和管理窗口、对话框和会话
import { BrowserWindow, dialog, session } from 'electron'
// 导入Node.js路径模块，用于处理文件路径
import path from 'node:path'
// 导入工具函数，用于创建任务栏按钮和获取窗口大小信息
import { createTaskBarButtons, getWindowSizeInfo } from './utils'
// 导入通用工具函数，用于获取平台信息和判断操作系统类型
import { getPlatform, isLinux, isWin } from '@common/utils'
// 导入代理设置和开发工具相关函数
import { getProxy, openDevTools as handleOpenDevTools } from '@main/utils'
// 导入主进程IPC通信函数
import { mainSend } from '@common/mainIpc'
// 导入渲染进程事件相关函数
import { sendFocus, sendTaskbarButtonClick } from './rendererEvent'
// 导入路径编码函数，用于处理特殊字符路径
import { encodePath } from '@common/utils/electron'

// 主窗口实例引用，全局变量保存窗口对象，初始为null
let browserWindow: Electron.BrowserWindow | null = null

/**
 * 设置主窗口事件监听
 * 处理窗口关闭、聚焦、显示等事件
 * 该函数负责为主窗口注册各种事件处理器，实现窗口状态管理和用户交互响应
 */
const winEvent = () => {
  // 如果窗口实例不存在，直接返回
  if (!browserWindow) return

  // 监听窗口关闭事件 - 实现托盘最小化或完全退出的逻辑
  browserWindow.on('close', event => {
    // 如果设置了跳过托盘退出或未启用托盘功能，则直接关闭窗口
    // isSkipTrayQuit: 用户选择直接退出的标志
    // tray.enable: 托盘功能启用状态
    if (global.lx.isSkipTrayQuit || !global.lx.appSetting['tray.enable']) {
      // 清除任务栏进度条显示
      browserWindow!.setProgressBar(-1)
      // 触发主窗口关闭事件，通知其他模块进行清理工作
      global.lx.event_app.main_window_close()
      return
    }

    // 否则阻止窗口关闭，改为隐藏窗口（最小化到托盘）
    event.preventDefault() // 阻止默认的关闭行为
    browserWindow!.hide()  // 隐藏窗口而不是关闭
  })

  // 监听窗口已关闭事件 - 清理资源
  browserWindow.on('closed', () => {
    // 清除窗口引用，释放内存
    browserWindow = null
  })

  // 监听窗口获得焦点事件 - 处理窗口激活
  browserWindow.on('focus', () => {
    // 发送焦点事件到渲染进程，通知UI更新
    sendFocus()
    // 触发主窗口获得焦点事件，通知其他模块
    global.lx.event_app.main_window_focus()
  })

  // 监听窗口失去焦点事件 - 处理窗口非激活状态
  browserWindow.on('blur', () => {
    // 触发主窗口失去焦点事件，通知其他模块
    global.lx.event_app.main_window_blur()
  })

  // 监听窗口准备好显示事件（仅触发一次）- 初始化显示
  browserWindow.once('ready-to-show', () => {
    // 显示窗口，确保窗口可见
    showWindow()
    // 设置任务栏缩略图按钮，初始化媒体控制
    setThumbarButtons()
    // 触发主窗口准备好显示事件，通知应用程序继续初始化
    global.lx.event_app.main_window_ready_to_show()
  })

  // 监听窗口显示事件 - 处理窗口可见性变化
  browserWindow.on('show', () => {
    // 通知应用窗口已显示
    global.lx.event_app.main_window_show()

    // 修复隐藏窗口后再显示时任务栏按钮丢失的问题
    // Windows平台特有的问题修复
    setThumbarButtons()
  })
  
  // 监听窗口隐藏事件 - 处理窗口隐藏到托盘
  browserWindow.on('hide', () => {
    // 通知应用窗口已隐藏
    global.lx.event_app.main_window_hide()
  })
}


/**
 * 创建主窗口
 * 根据应用设置创建并配置主窗口，包括窗口大小、主题、代理设置等
 * 这是应用程序的核心函数，负责初始化和配置主界面窗口
 */
export const createWindow = () => {
  // 关闭已存在的窗口，确保不会创建多个主窗口实例
  closeWindow()
  // 获取窗口大小配置信息，从用户设置中读取窗口尺寸ID
  const windowSizeInfo = getWindowSizeInfo(global.lx.appSetting['common.windowSizeId'])

  // 获取主题配置，包括是否使用深色模式和主题颜色
  const { shouldUseDarkColors, theme } = global.lx.theme
  // 创建持久化会话，使窗口可以保存cookies和缓存
  const ses = session.fromPartition('persist:win-main')
  // 获取代理设置，支持通过代理访问网络
  const proxy = getProxy()
  // 如果有代理设置，则应用到会话中
  if (proxy) {
    // 使用void操作符忽略Promise返回值
    void ses.setProxy({
      // 设置HTTP代理规则
      proxyRules: `http://${proxy.host}:${proxy.port}`,
    })
  }

  /**
   * 初始窗口选项配置
   * 设置窗口的尺寸、外观和Web内容行为等属性
   * 这些选项决定了窗口的外观和行为特性
   */
  const options: Electron.BrowserWindowConstructorOptions = {
    height: windowSizeInfo.height,            // 窗口高度
    useContentSize: true,                     // 使用内容尺寸
    width: windowSizeInfo.width,              // 窗口宽度
    frame: false,                             // 无边框窗口
    transparent: !global.envParams.cmdParams.dt, // 是否透明（根据命令行参数决定）
    hasShadow: global.envParams.cmdParams.dt, // 是否有阴影（根据命令行参数决定）
    // enableRemoteModule: false,             // 禁用远程模块（已注释）
    // icon: join(global.__static, isWin ? 'icons/256x256.ico' : 'icons/512x512.png'), // 窗口图标（已注释）
    resizable: false,                         // 禁止调整大小
    maximizable: false,                       // 禁止最大化
    fullscreenable: true,                     // 允许全屏
    roundedCorners: false,                    // 禁用圆角
    show: false,                              // 创建时不显示窗口
    webPreferences: {                         // Web内容首选项
      session: ses,                           // 使用指定会话
      nodeIntegrationInWorker: true,          // 在Web Worker中启用Node集成
      contextIsolation: false,                // 禁用上下文隔离
      webSecurity: false,                     // 禁用Web安全策略
      nodeIntegration: true,                  // 启用Node集成
      sandbox: false,                         // 禁用沙箱
      enableWebSQL: false,                    // 禁用WebSQL
      webgl: false,                           // 禁用WebGL
      spellcheck: false,                      // 禁用拼写检查器
    },
  }
  // 如果启用了不透明模式，设置背景颜色
  if (global.envParams.cmdParams.dt) options.backgroundColor = theme.colors['--color-primary-light-1000']
  // 如果设置了启动时全屏，配置全屏选项
  if (global.lx.appSetting['common.startInFullscreen']) {
    options.fullscreen = true
    // Linux平台需要设置为可调整大小才能全屏
    if (isLinux) options.resizable = true
  }
  // 创建浏览器窗口实例
  browserWindow = new BrowserWindow(options)

  // 根据环境确定加载的URL（开发环境使用本地服务器，生产环境使用本地文件）
  const winURL = process.env.NODE_ENV !== 'production' ? 'http://localhost:9080' : `file://${path.join(encodePath(__dirname), 'index.html')}`
  // 加载URL并传递操作系统、主题等参数
  void browserWindow.loadURL(winURL + `?os=${getPlatform()}&dt=${!!global.envParams.cmdParams.dt}&dark=${shouldUseDarkColors}&theme=${encodeURIComponent(JSON.stringify(theme))}`)

  // 设置窗口事件监听
  winEvent()

  // 如果命令行参数指定了打开开发工具，则打开开发工具
  if (global.envParams.cmdParams.odt) handleOpenDevTools(browserWindow.webContents)

  // global.lx.mainWindowClosed = false  // 窗口关闭标志（已注释）
  // browserWindow.webContents.openDevTools()  // 打开开发工具（已注释）
  // 触发主窗口创建事件
  global.lx.event_app.main_window_created(browserWindow)
}

export const isExistWindow = (): boolean => !!browserWindow

/**
 * 检查主窗口是否显示且活跃
 * 在Windows平台上只检查可见性，在其他平台上还检查是否获得焦点
 * @returns {boolean} 如果窗口显示且活跃返回true，否则返回false
 */
export const isShowWindow = (): boolean => {
  if (!browserWindow) return false
  return browserWindow.isVisible() && (isWin ? true : browserWindow.isFocused())
}

/**
 * 关闭主窗口
 * 触发窗口的close事件，会根据托盘设置决定是关闭还是隐藏
 */
export const closeWindow = () => {
  if (!browserWindow) return
  browserWindow.close()
}

/**
 * 设置窗口的网络代理
 * 根据应用设置或环境变量配置HTTP代理
 * 如果没有代理设置，则清除代理规则
 */
export const setProxy = () => {
  if (!browserWindow) return
  const proxy = getProxy()
  if (proxy) {
    // 设置HTTP代理规则
    void browserWindow.webContents.session.setProxy({
      proxyRules: `http://${proxy.host}:${proxy.port}`,
    })
  } else {
    // 清除代理规则
    void browserWindow.webContents.session.setProxy({
      proxyRules: '',
    })
  }
}


/**
 * 向主窗口发送事件
 * 使用IPC通信向渲染进程发送事件和数据
 * @param {string} name - 事件名称
 * @param {T} [params] - 可选的事件参数
 * @template T - 参数类型
 */
export const sendEvent = <T = any>(name: string, params?: T) => {
  if (!browserWindow) return
  mainSend(browserWindow, name, params)
}

/**
 * 显示文件/目录选择对话框
 * 打开系统原生的文件选择对话框，允许用户选择文件或目录
 * @param {Electron.OpenDialogOptions} options - 对话框选项
 * @returns {Promise<Electron.OpenDialogReturnValue>} 包含用户选择结果的Promise
 * @throws {Error} 如果主窗口未定义则抛出错误
 */
export const showSelectDialog = async(options: Electron.OpenDialogOptions) => {
  if (!browserWindow) throw new Error('main window is undefined')
  return dialog.showOpenDialog(browserWindow, options)
}

/**
 * 显示消息对话框
 * 显示系统原生的消息对话框，用于展示信息、警告或错误
 * @param {object} options - 对话框选项
 * @param {string} options.type - 对话框类型（info、warning、error等）
 * @param {string} options.message - 对话框主要消息
 * @param {string} options.detail - 对话框详细信息
 */
export const showDialog = ({ type, message, detail }: Electron.MessageBoxSyncOptions) => {
  if (!browserWindow) return
  dialog.showMessageBoxSync(browserWindow, {
    type,
    message,
    detail,
  })
}

/**
 * 显示保存文件对话框
 * 打开系统原生的保存文件对话框，允许用户选择保存位置
 * @param {Electron.SaveDialogOptions} options - 保存对话框选项
 * @returns {Promise<Electron.SaveDialogReturnValue>} 包含用户选择结果的Promise
 * @throws {Error} 如果主窗口未定义则抛出错误
 */
export const showSaveDialog = async(options: Electron.SaveDialogOptions) => {
  if (!browserWindow) throw new Error('main window is undefined')
  return dialog.showSaveDialog(browserWindow, options)
}
/**
 * 最小化窗口
 * 将窗口最小化到任务栏
 */
export const minimize = () => {
  if (!browserWindow) return
  browserWindow.minimize()
}

/**
 * 最大化窗口
 * 将窗口最大化铺满屏幕
 */
export const maximize = () => {
  if (!browserWindow) return
  browserWindow.maximize()
}

/**
 * 取消窗口最大化
 * 将窗口从最大化状态恢复到正常大小
 */
export const unmaximize = () => {
  if (!browserWindow) return
  browserWindow.unmaximize()
}

/**
 * 切换窗口显示/隐藏状态
 * 如果窗口当前可见则隐藏，如果当前隐藏则显示
 */
export const toggleHide = () => {
  if (!browserWindow) return
  browserWindow.isVisible()
    ? browserWindow.hide()
    : browserWindow.show()
}

/**
 * 切换窗口最小化状态
 * 如果窗口当前可见且未最小化，则最小化窗口
 * 如果窗口当前最小化，则恢复窗口
 * 如果窗口当前隐藏，则显示窗口
 */
export const toggleMinimize = () => {
  if (!browserWindow) return
  if (browserWindow.isVisible()) {
    if (browserWindow.isMinimized()) browserWindow.restore()
    else browserWindow.minimize()
  } else browserWindow.show()
}

/**
 * 显示窗口并使其获得焦点
 * 如果窗口当前可见但最小化，则恢复窗口
 * 如果窗口当前可见且未最小化，则使其获得焦点
 * 如果窗口当前隐藏，则显示窗口
 */
export const showWindow = () => {
  if (!browserWindow) return
  if (browserWindow.isVisible()) {
    if (browserWindow.isMinimized()) browserWindow.restore()
    else browserWindow.focus()
  } else browserWindow.show()
}

/**
 * 隐藏窗口
 * 将窗口隐藏但不关闭
 */
export const hideWindow = () => {
  if (!browserWindow) return
  browserWindow.hide()
}
/**
 * 设置窗口边界
 * 调整窗口的位置和大小
 * @param {Partial<Electron.Rectangle>} options - 窗口边界选项，可包含x、y、width、height属性
 */
export const setWindowBounds = (options: Partial<Electron.Rectangle>) => {
  if (!browserWindow) return
  browserWindow.setBounds(options)
}

/**
 * 设置任务栏进度条
 * 在任务栏图标上显示进度条，用于显示播放进度或加载状态
 * @param {number} progress - 进度值，范围0-1，设为-1则移除进度条
 * @param {Electron.ProgressBarOptions} [options] - 进度条选项，如模式（正常、暂停、错误等）
 */
export const setProgressBar = (progress: number, options?: Electron.ProgressBarOptions) => {
  if (!browserWindow) return
  browserWindow.setProgressBar(progress, options)
}

/**
 * 设置是否忽略鼠标事件
 * 当设置为忽略时，鼠标点击可以穿透窗口，用于实现点击穿透效果
 * @param {boolean} ignore - 是否忽略鼠标事件
 * @param {Electron.IgnoreMouseEventsOptions} [options] - 忽略鼠标事件的选项，如是否转发事件
 */
export const setIgnoreMouseEvents = (ignore: boolean, options?: Electron.IgnoreMouseEventsOptions) => {
  if (!browserWindow) return
  browserWindow.setIgnoreMouseEvents(ignore, options)
}

/**
 * 切换开发者工具
 * 如果开发者工具当前打开则关闭，如果当前关闭则打开
 */
export const toggleDevTools = () => {
  if (!browserWindow) return
  if (browserWindow.webContents.isDevToolsOpened()) {
    browserWindow.webContents.closeDevTools()
  } else {
    handleOpenDevTools(browserWindow.webContents)
  }
}

/**
 * 设置窗口全屏状态
 * 根据不同平台特性处理全屏模式切换
 * @param {boolean} isFullscreen - 是否进入全屏模式
 * @returns {boolean} 返回设置的全屏状态
 */
export const setFullScreen = (isFullscreen: boolean): boolean => {
  if (!browserWindow) return false
  if (isLinux) { // linux 需要先设置为可调整窗口大小才能全屏
    if (isFullscreen) {
      browserWindow.setResizable(isFullscreen)
      browserWindow.setFullScreen(isFullscreen)
    } else {
      browserWindow.setFullScreen(isFullscreen)
      browserWindow.setResizable(isFullscreen)
    }
  } else {
    browserWindow.setFullScreen(isFullscreen)
  }
  return isFullscreen
}

/**
 * 任务栏按钮状态标志
 * 控制Windows任务栏缩略图上的媒体控制按钮状态
 */
const taskBarButtonFlags: LX.TaskBarButtonFlags = {
  empty: true,    // 是否为空状态（无歌曲）
  collect: false, // 是否已收藏
  play: false,    // 是否正在播放
  next: true,     // 下一曲按钮是否可用
  prev: true,     // 上一曲按钮是否可用
}

/**
 * 设置任务栏缩略图按钮
 * 在Windows平台上为任务栏缩略图添加媒体控制按钮
 * @param {LX.TaskBarButtonFlags} param - 按钮状态配置，默认使用taskBarButtonFlags
 */
export const setThumbarButtons = ({ empty, collect, play, next, prev }: LX.TaskBarButtonFlags = taskBarButtonFlags) => {
  if (!isWin || !browserWindow) return
  taskBarButtonFlags.empty = empty
  taskBarButtonFlags.collect = collect
  taskBarButtonFlags.play = play
  taskBarButtonFlags.next = next
  taskBarButtonFlags.prev = prev
  browserWindow.setThumbarButtons(createTaskBarButtons(taskBarButtonFlags, action => {
    sendTaskbarButtonClick(action)
  }))
}

/**
 * 设置任务栏缩略图裁剪区域
 * 指定窗口的哪一部分区域用于任务栏缩略图显示
 * @param {Electron.Rectangle} region - 裁剪区域，包含x、y、width、height属性
 */
export const setThumbnailClip = (region: Electron.Rectangle) => {
  if (!browserWindow) return
  browserWindow.setThumbnailClip(region)
}


/**
 * 清除窗口缓存
 * 清除渲染进程的HTTP缓存数据
 * @returns {Promise<void>} 清除完成的Promise
 * @throws {Error} 如果主窗口未定义则抛出错误
 */
export const clearCache = async() => {
  if (!browserWindow) throw new Error('main window is undefined')
  await browserWindow.webContents.session.clearCache()
}

/**
 * 获取缓存大小
 * 获取渲染进程的HTTP缓存数据大小（字节数）
 * @returns {Promise<number>} 包含缓存大小的Promise
 * @throws {Error} 如果主窗口未定义则抛出错误
 */
export const getCacheSize = async() => {
  if (!browserWindow) throw new Error('main window is undefined')
  return browserWindow.webContents.session.getCacheSize()
}

/**
 * 获取窗口的WebContents对象
 * 用于直接操作窗口的网页内容
 * @returns {Electron.WebContents} 窗口的WebContents对象
 * @throws {Error} 如果主窗口未定义则抛出错误
 */
export const getWebContents = (): Electron.WebContents => {
  if (!browserWindow) throw new Error('main window is undefined')
  return browserWindow.webContents
}
