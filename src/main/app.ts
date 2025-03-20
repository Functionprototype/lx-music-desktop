/**
 * app.ts
 * 主进程应用程序初始化和配置文件
 * 负责应用程序的全局数据初始化、单例处理、环境参数配置、用户数据路径设置、深度链接注册和应用事件监听等核心功能
 */

import path from 'node:path'
import { existsSync, mkdirSync, renameSync } from 'fs'
import { app, shell, screen, nativeTheme, dialog } from 'electron'
import { URL_SCHEME_RXP } from '@common/constants' // 导入URL协议正则表达式
import { getTheme, initHotKey, initSetting, parseEnvParams } from './utils'
import { navigationUrlWhiteList } from '@common/config' // 导入导航URL白名单
import defaultSetting from '@common/defaultSetting' // 导入默认设置
import { isExistWindow as isExistMainWindow, showWindow as showMainWindow } from './modules/winMain'
import { createAppEvent, createDislikeEvent, createListEvent } from '@main/event' // 导入事件创建函数
import { isMac, log } from '@common/utils' // 导入工具函数
import createWorkers from './worker' // 导入工作线程创建函数
import { migrateDBData } from './utils/migrate' // 导入数据迁移函数
import { openDirInExplorer } from '@common/utils/electron' // 导入文件浏览器打开函数

/**
 * 初始化全局数据
 * 解析环境参数并设置全局变量，包括应用设置、事件处理器、主题、播放器状态等
 */
export const initGlobalData = () => {
  // 解析命令行参数和深度链接
  const envParams = parseEnvParams()
  global.envParams = {
    cmdParams: envParams.cmdParams, // 命令行参数
    deeplink: envParams.deeplink,   // 深度链接URL
  }
  
  // 初始化全局lx对象，包含应用的核心状态和功能
  global.lx = {
    inited: false,                    // 应用是否已初始化
    isSkipTrayQuit: false,            // 是否跳过托盘退出确认
    // mainWindowClosed: true,        // 主窗口是否已关闭
    event_app: createAppEvent(),      // 应用事件处理器
    event_list: createListEvent(),    // 列表事件处理器
    event_dislike: createDislikeEvent(), // 不喜欢列表事件处理器
    appSetting: defaultSetting,       // 应用设置，使用默认值
    worker: createWorkers(),          // 创建工作线程
    
    // 热键配置
    hotKey: {
      enable: true,                   // 热键功能是否启用
      config: {
        local: {                      // 本地热键配置
          enable: false,
          keys: {},
        },
        global: {                     // 全局热键配置
          enable: false,
          keys: {},
        },
      },
      state: new Map(),               // 热键状态映射
    },
    
    // 主题配置
    theme: {
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors, // 是否使用深色主题
      theme: {
        id: '',                      // 主题ID
        name: '',                     // 主题名称
        isDark: false,                // 是否为深色主题
        colors: {},                   // 主题颜色配置
      },
    },
    
    // 播放器状态
    player_status: {
      status: 'stoped',               // 播放状态：停止
      name: '',                       // 歌曲名称
      singer: '',                     // 歌手名称
      albumName: '',                  // 专辑名称
      picUrl: '',                     // 封面图片URL
      progress: 0,                    // 播放进度
      duration: 0,                    // 歌曲时长
      playbackRate: 1,                // 播放速率
      lyricLineText: '',              // 当前歌词行文本
      lyricLineAllText: '',           // 当前歌词行完整文本
      lyric: '',                      // 歌词内容
      collect: false,                 // 是否收藏
    },
  }

  // 设置静态资源路径，根据环境不同选择不同路径
  global.staticPath =
    process.env.NODE_ENV !== 'production'
      ? webpackStaticPath             // 开发环境使用webpack配置的路径
      : path.join(__dirname, 'static') // 生产环境使用相对路径
}

/**
 * 初始化单例应用程序处理
 * 确保应用程序只有一个实例在运行，处理第二个实例启动时的行为
 */
export const initSingleInstanceHandle = () => {
  // 请求单例锁，如果无法获取锁（说明已有实例在运行），则退出当前实例
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
  }

  // 监听第二个实例启动事件
  app.on('second-instance', (event, argv, cwd) => {
    // 检查启动参数中是否包含深度链接URL
    for (const param of argv) {
      if (URL_SCHEME_RXP.test(param)) {
        global.envParams.deeplink = param
        break
      }
    }

    // 如果主窗口存在，则根据情况处理深度链接或显示主窗口
    if (isExistMainWindow()) {
      if (global.envParams.deeplink) global.lx.event_app.deeplink(global.envParams.deeplink)
      else showMainWindow()
    } else {
      // 如果主窗口不存在，则退出应用
      app.quit()
    }
  })
}

/**
 * 应用Electron环境参数
 * 根据命令行参数和平台特性配置Electron运行环境
 */
export const applyElectronEnvParams = () => {
  // 根据命令行参数禁用硬件加速
  if (global.envParams.cmdParams.dha) app.disableHardwareAcceleration()
  // 禁用硬件媒体按键处理
  if (global.envParams.cmdParams.dhmkh) app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling')

  // 修复Linux平台透明窗口失效问题
  // 参考: https://github.com/electron/electron/issues/25153#issuecomment-843688494
  if (process.platform == 'linux') app.commandLine.appendSwitch('use-gl', 'desktop')

  // 禁用窗口动画以提高性能
  // 参考: https://github.com/electron/electron/issues/22691
  app.commandLine.appendSwitch('wm-window-animations-disabled')

  // 禁用GPU沙盒以解决某些图形问题
  app.commandLine.appendSwitch('--disable-gpu-sandbox')

  // 配置代理服务器
  if (global.envParams.cmdParams['proxy-server']) {
    app.commandLine.appendSwitch('proxy-server', global.envParams.cmdParams['proxy-server'])
    app.commandLine.appendSwitch('proxy-bypass-list', global.envParams.cmdParams['proxy-bypass-list'] ?? '<local>')
  }
}

/**
 * 设置用户数据路径
 * 配置应用程序数据的存储位置，支持便携模式
 */
export const setUserDataPath = () => {
  // Windows平台便携模式支持：
  // 如果应用目录下存在portable文件夹，则将数据存储在此文件夹下
  if (process.platform == 'win32') {
    const portablePath = path.join(path.dirname(app.getPath('exe')), '/portable')
    if (existsSync(portablePath)) {
      // 设置应用数据路径为portable文件夹
      app.setPath('appData', portablePath)
      // 在portable文件夹下创建userData文件夹
      const appDataPath = path.join(portablePath, '/userData')
      if (!existsSync(appDataPath)) mkdirSync(appDataPath)
      // 设置用户数据路径
      app.setPath('userData', appDataPath)
    }
  }

  // 获取最终的用户数据路径
  const userDataPath = app.getPath('userData')
  // 保存原始用户数据路径
  global.lxOldDataPath = userDataPath
  // 设置应用专用数据路径
  global.lxDataPath = path.join(userDataPath, 'LxDatas')
  // 确保数据目录存在
  if (!existsSync(global.lxDataPath)) mkdirSync(global.lxDataPath)
}

/**
 * 注册深度链接处理
 * 设置应用为lxmusic协议的默认处理程序，并处理通过协议启动应用的情况
 * @param startApp 启动应用的回调函数
 */
export const registerDeeplink = (startApp: () => void) => {
  if (process.env.NODE_ENV !== 'production' && process.platform === 'win32') {
    // 在Windows开发环境下设置协议处理程序需要额外参数
    // 这两个额外参数只在Windows平台可用
    // console.log(process.execPath, process.argv)
    app.setAsDefaultProtocolClient('lxmusic', process.execPath, process.argv.slice(1))
  } else {
    // 在生产环境或非Windows平台下的简化设置
    app.setAsDefaultProtocolClient('lxmusic')
  }

  // 监听通过深度链接打开应用的事件
  app.on('open-url', (event, url) => {
    // 验证URL是否符合应用协议格式
    if (!URL_SCHEME_RXP.test(url)) return
    event.preventDefault()
    // 保存深度链接URL
    global.envParams.deeplink = url
    // 根据主窗口状态决定处理方式
    if (isExistMainWindow()) {
      // 如果主窗口存在，则触发深度链接事件或显示主窗口
      if (global.envParams.deeplink) global.lx.event_app.deeplink(global.envParams.deeplink)
      else showMainWindow()
    } else {
      // 如果主窗口不存在，则启动应用
      startApp()
    }
  })
}

/**
 * 监听应用程序事件
 * 设置各种应用级别的事件监听器，包括网页内容安全、窗口激活、应用退出、屏幕参数和主题变化等
 * @param startApp 启动应用的回调函数
 */
export const listenerAppEvent = (startApp: () => void) => {
  // 监听网页内容创建事件，设置安全限制和行为
  app.on('web-contents-created', (event, contents) => {
    // 监听页面导航事件，限制导航到白名单URL
    contents.on('will-navigate', (event, navigationUrl) => {
      // 开发环境下打印导航URL但不限制
      if (process.env.NODE_ENV !== 'production') {
        console.log('navigation to url:', navigationUrl.length > 130 ? navigationUrl.substring(0, 130) + '...' : navigationUrl)
        return
      }
      // 生产环境下只允许导航到白名单URL
      if (!navigationUrlWhiteList.some(url => url.test(navigationUrl))) {
        event.preventDefault()
        return
      }
      console.log('navigation to url:', navigationUrl)
    })
    
    // 设置窗口打开处理器，外部链接使用系统浏览器打开
    contents.setWindowOpenHandler(({ url }) => {
      if (!/^devtools/.test(url) && /^https?:\/\//.test(url)) {
        void shell.openExternal(url)
      }
      console.log(url)
      return { action: 'deny' } // 阻止应用内创建新窗口
    })
    
    // 监听webview附加事件，设置安全限制
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      // 移除预加载脚本或验证其位置合法性
      delete webPreferences.preload
      // delete webPreferences.preloadURL

      // 禁用Node.js集成，提高安全性
      webPreferences.nodeIntegration = false

      // 验证加载的URL
      if (!navigationUrlWhiteList.some(url => url.test(params.src))) {
        event.preventDefault()
      }
    })

    // 禁用拼写检查字典下载，解决相关问题
    // 参考: https://github.com/lyswhut/lx-music-desktop/issues/773
    contents.session.setSpellCheckerDictionaryDownloadURL('http://0.0.0.0')
  })

  // 监听应用激活事件（macOS点击Dock图标）
  app.on('activate', () => {
    if (isExistMainWindow()) {
      showMainWindow()
    } else {
      startApp()
    }
  })

  // 监听应用退出前事件
  app.on('before-quit', () => {
    global.lx.isSkipTrayQuit = true // 设置标志跳过托盘退出确认
  })
  
  // 监听所有窗口关闭事件
  app.on('window-all-closed', () => {
    // macOS下不退出应用，符合平台习惯
    if (isMac) return

    app.quit() // 非macOS平台退出应用
  })

  // 初始化屏幕参数函数
  const initScreenParams = () => {
    global.envParams.workAreaSize = screen.getPrimaryDisplay().workAreaSize
  }
  
  // 应用就绪时初始化屏幕参数并监听屏幕变化
  app.on('ready', () => {
    screen.on('display-metrics-changed', initScreenParams)
    initScreenParams()
  })

  // 监听系统主题变化
  nativeTheme.addListener('updated', () => {
    const shouldUseDarkColors = nativeTheme.shouldUseDarkColors
    // 避免重复触发
    if (shouldUseDarkColors == global.lx.theme.shouldUseDarkColors) return
    // 更新主题状态并触发事件
    global.lx.theme.shouldUseDarkColors = shouldUseDarkColors
    global.lx?.event_app.system_theme_change(shouldUseDarkColors)
  })
}

/**
 * 初始化主题设置
 * 设置应用主题并监听主题配置变化和系统主题变化事件
 */
const initTheme = () => {
  // 初始化应用主题
  global.lx.theme = getTheme()
  
  // 定义需要监听变化的主题配置键
  const themeConfigKeys = ['theme.id', 'theme.lightId', 'theme.darkId']
  
  // 监听配置更新事件
  global.lx.event_app.on('updated_config', (keys) => {
    // 检查是否有主题相关配置变化
    let requireUpdate = false
    for (const key of keys) {
      if (themeConfigKeys.includes(key)) {
        requireUpdate = true
        break
      }
    }
    
    // 如果主题配置有变化，更新主题并触发主题变化事件
    if (requireUpdate) {
      global.lx.theme = getTheme()
      global.lx.event_app.theme_change()
    }
  })
  
  // 监听系统主题变化事件
  global.lx.event_app.on('system_theme_change', () => {
    // 如果主题设置为自动（跟随系统），则更新主题
    if (global.lx.appSetting['theme.id'] == 'auto') {
      global.lx.theme = getTheme()
      global.lx.event_app.theme_change()
    }
  })
}

/**
 * 初始化应用设置
 * 加载热键配置、初始化数据库、加载应用设置并初始化主题
 */
let isInitialized = false
export const initAppSetting = async() => {
  // 初始化热键配置（如果尚未初始化）
  if (!global.lx.inited) {
    const config = await initHotKey()
    global.lx.hotKey.config.local = config.local
    global.lx.hotKey.config.global = config.global
    global.lx.inited = true
  }

  // 首次运行时初始化数据库和设置
  if (!isInitialized) {
    // 初始化数据库服务
    let dbFileExists = await global.lx.worker.dbService.init(global.lxDataPath)
    
    // 处理数据库验证失败的情况
    if (dbFileExists === null) {
      // 创建备份路径
      const backPath = path.join(global.lxDataPath, `lx.data.db.${Date.now()}.bak`)
      // 显示警告对话框
      dialog.showMessageBoxSync({
        type: 'warning',
        message: 'Database verify failed',
        detail: `数据库表结构校验失败，我们将把有问题的数据库备份到：${backPath}\n若此问题导致你的数据丢失，你可以尝试从备份文件找回它们。\n\nThe database table structure verification failed, we will back up the problematic database to: ${backPath}\nIf this problem causes your data to be lost, you can try to retrieve them from the backup file.`,
      })
      // 备份有问题的数据库文件
      renameSync(path.join(global.lxDataPath, 'lx.data.db'), backPath)
      // 打开备份文件所在目录
      openDirInExplorer(backPath)
      // 重新初始化数据库
      dbFileExists = await global.lx.worker.dbService.init(global.lxDataPath)
    }
    
    // 加载应用设置
    global.lx.appSetting = (await initSetting()).setting
    
    // 如果数据库是新创建的，尝试迁移旧数据
    if (!dbFileExists) await migrateDBData().catch(err => { log.error(err) })
    
    // 初始化主题
    initTheme()
  }
  // global.lx.theme = getTheme()

  // 标记初始化完成
  isInitialized ||= true
}

/**
 * 退出应用程序
 * 设置跳过托盘退出确认标志并调用应用退出方法
 */
export const quitApp = () => {
  // 设置跳过托盘退出确认的标志
  global.lx.isSkipTrayQuit = true
  // 退出应用程序
  app.quit()
}
