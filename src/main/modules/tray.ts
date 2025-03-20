/**
 * tray.ts
 * 系统托盘模块
 * 核心功能：
 * 1. 创建/销毁系统托盘图标及上下文菜单
 * 2. 管理多主题托盘图标切换（支持自动适应系统主题）
 * 3. 实现播放控制、窗口管理、歌词显示等交互功能
 * 4. 处理多语言国际化支持
 * 5. 响应系统主题变化和配置更新事件
 */

// 导入Electron相关模块，用于创建系统托盘、菜单和图像处理
import { Tray, Menu, nativeImage } from 'electron'
// 导入平台判断工具，用于区分macOS和Windows平台
import { isMac, isWin } from '@common/utils'
// 导入Node.js路径模块，用于处理文件路径
import path from 'node:path'
// 导入主窗口相关函数，用于控制主窗口的显示、隐藏和状态检查
import {
  hideWindow as hideMainWindow, // 隐藏主窗口的函数
  isExistWindow as isExistMainWindow, // 检查主窗口是否存在的函数
  isShowWindow as isShowMainWindow, // 检查主窗口是否显示的函数
  sendTaskbarButtonClick, // 发送任务栏按钮点击事件的函数
  showWindow as showMainWindow, // 显示主窗口的函数
} from './winMain'
// 导入应用退出函数
import { quitApp } from '@main/app'
// 导入自动主题ID常量，用于托盘图标主题自动切换
import { TRAY_AUTO_ID } from '@common/constants'

// 托盘实例引用，用于控制整个生命周期
let tray: Electron.Tray | null // 托盘对象实例，初始为null，创建后保存引用
// 托盘功能启用状态标识，与配置同步
let isEnableTray: boolean = false // 托盘功能是否启用的状态标志，默认为false
let themeId: number // 当前使用的托盘主题ID
let isShowStatusBarLyric: boolean = false // 是否在状态栏显示歌词，默认为false

// 播放器状态机，用于控制菜单项的可用状态
const playerState = {
  empty: false, // 是否无歌曲状态，影响所有控制按钮
  collect: false, // 当前歌曲是否已收藏
  play: false, // 是否正在播放状态
  next: true, // 下一曲按钮是否可用
  prev: true, // 上一曲按钮是否可用
}

// 需要监听的配置项键名，用于触发托盘更新
const watchConfigKeys: Array<keyof LX.AppSetting> = [
  'desktopLyric.enable', // 桌面歌词是否启用
  'desktopLyric.isLock', // 桌面歌词是否锁定
  'desktopLyric.isAlwaysOnTop', // 桌面歌词是否置顶
  'tray.themeId', // 托盘图标主题ID
  'tray.enable', // 托盘功能是否启用
  'player.isShowStatusBarLyric', // 是否在状态栏显示歌词
  'common.langId', // 应用语言ID
] satisfies Array<keyof LX.AppSetting> // 使用satisfies确保类型安全

// 托盘主题配置集合
// isNative标识是否使用Electron原生模板图标
const themeList = [
  {
    id: 0, // 主题ID，用于标识和选择主题
    fileName: 'trayTemplate', // 图标文件名，不含扩展名
    isNative: true, // 是否使用Electron原生模板图标（适合macOS深色模式）
  },
  {
    id: 1, // 原始主题
    fileName: 'tray_origin', // 原始图标文件名
    isNative: false, // 非原生模板图标
  },
  {
    id: 2, // 黑色主题
    fileName: 'tray_black', // 黑色图标文件名
    isNative: false, // 非原生模板图标
  },
]

// 多语言字典配置
// 支持简体中文、繁体中文、英文三种语言
const messages = {
  'en-us': { // 英文(美国)语言包
    collect: 'Love', // 收藏
    uncollect: 'Unlove', // 取消收藏
    play: 'Play', // 播放
    pause: 'Pause', // 暂停
    next: 'Next Song', // 下一曲
    prev: 'Prev Song', // 上一曲
    hide_win_main: 'Hide Main Window', // 隐藏主窗口
    show_win_main: 'Show Main Window', // 显示主窗口
    hide_win_lyric: 'Hide Lyric Window', // 隐藏歌词窗口
    show_win_lyric: 'Show Lyric Window', // 显示歌词窗口
    lock_win_lyric: 'Lock Lyric Window', // 锁定歌词窗口
    unlock_win_lyric: 'Unlock Lyric Window', // 解锁歌词窗口
    top_win_lyric: 'On-top Lyric Window', // 歌词窗口置顶
    untop_win_lyric: 'Un-top Lyric Window', // 取消歌词窗口置顶
    show_statusbar_lyric: 'Show Lyrics on Statusbar', // 显示状态栏歌词
    hide_statusbar_lyric: 'Hide Lyrics on Statusbar', // 隐藏状态栏歌词
    exit: 'Exit', // 退出
    music_name: 'Title: ', // 歌曲标题
    music_singer: 'Artist: ', // 艺术家
  },
  'zh-cn': { // 简体中文语言包
    collect: '收藏',
    uncollect: '取消收藏',
    play: '播放',
    pause: '暂停',
    next: '下一曲',
    prev: '上一曲',
    hide_win_main: '隐藏主界面',
    show_win_main: '显示主界面',
    hide_win_lyric: '关闭桌面歌词',
    show_win_lyric: '开启桌面歌词',
    lock_win_lyric: '锁定桌面歌词',
    unlock_win_lyric: '解锁桌面歌词',
    top_win_lyric: '置顶歌词',
    untop_win_lyric: '取消置顶',
    show_statusbar_lyric: '显示状态栏歌词',
    hide_statusbar_lyric: '隐藏状态栏歌词',
    exit: '退出',
    music_name: '歌曲名: ',
    music_singer: '艺术家: ',
  },
  'zh-tw': { // 繁体中文语言包
    collect: '收藏',
    uncollect: '取消收藏',
    play: '播放',
    pause: '暫停',
    next: '下一曲',
    prev: '上一曲',
    hide_win_main: '隱藏軟體視窗',
    show_win_main: '顯示軟體視窗',
    hide_win_lyric: '關閉歌詞視窗',
    show_win_lyric: '開啟歌詞視窗',
    lock_win_lyric: '鎖定歌詞視窗',
    unlock_win_lyric: '解鎖歌詞視窗',
    top_win_lyric: '置頂歌詞視窗',
    untop_win_lyric: '取消置頂歌詞視窗',
    show_statusbar_lyric: '顯示狀態列歌詞',
    hide_statusbar_lyric: '隱藏狀態列歌詞',
    exit: '退出',
    music_name: '標題: ',
    music_singer: '演出者: ',
  },
} as const // 使用as const确保对象类型为只读
type Messages = typeof messages // 定义消息类型，基于messages对象的结构
type Langs = keyof Messages // 定义语言类型，基于Messages的键
const i18n = {
  message: messages['zh-cn'] as Messages[Langs], // 当前使用的消息集合，默认为简体中文
  fallbackLocale: 'en-us' as 'en-us', // 回退语言，当请求的语言不存在时使用
  getMessage(key: keyof Messages[Langs]) { // 获取指定键的消息文本
    return this.message[key] // 返回当前语言下对应的文本
  },
  setLang(lang?: Langs | null) { // 设置当前使用的语言
    this.message = lang
      ? messages[lang] ?? messages[this.fallbackLocale] // 如果指定语言存在则使用，否则使用回退语言
      : messages[this.fallbackLocale] // 如果未指定语言，则使用回退语言
  }
}
/**
 * 获取托盘图标路径
 * 根据主题ID和系统主题色获取适当的托盘图标路径
 * @param id 主题ID，TRAY_AUTO_ID表示自动根据系统主题选择
 * @returns 托盘图标的完整文件路径
 */
const getIconPath = (id: number) => {
  let theme = id == TRAY_AUTO_ID
    ? global.lx.theme.shouldUseDarkColors
      ? themeList[0] : themeList[2]
    : themeList.find(item => item.id === id) ?? themeList[0]
  return path.join(global.staticPath, 'images/tray', theme.fileName + (isWin ? '.ico' : '.png'))
}

/**
 * 创建系统托盘
 * 根据应用设置创建系统托盘图标，并设置点击事件
 * 仅在托盘功能启用且当前没有活动托盘时创建
 */
export const createTray = () => {
  // 检查托盘是否已存在或托盘功能是否禁用，如果是则直接返回不创建
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  if ((tray && !tray.isDestroyed()) || !global.lx.appSetting['tray.enable']) return

  // 创建托盘实例，使用当前主题的图标
  tray = new Tray(nativeImage.createFromPath(getIconPath(global.lx.appSetting['tray.themeId'])))

  // 以下两行被注释掉的代码是设置默认提示文本和创建右键菜单
  // tray.setToolTip('LX Music')
  // createMenu()
  // 禁用托盘双击事件（避免与单击事件冲突）
  tray.setIgnoreDoubleClickEvents(true)
  // 设置托盘单击事件，点击时显示主窗口
  tray.on('click', () => {
    showMainWindow()
  })
}

/**
 * 销毁系统托盘
 * 清理托盘资源并重置相关状态
 */
export const destroyTray = () => {
  // 如果托盘不存在，直接返回
  if (!tray) return
  // 销毁托盘实例，释放系统资源
  tray.destroy()
  // 重置托盘启用状态为false
  isEnableTray = false
  // 重置状态栏歌词显示状态为false
  isShowStatusBarLyric = false
  // 清空托盘引用
  tray = null
}

/**
 * 处理配置更新
 * 将配置更新事件发送到应用事件系统
 * @param setting 要更新的应用设置部分
 */
const handleUpdateConfig = (setting: Partial<LX.AppSetting>) => {
  global.lx.event_app.update_config(setting)
}

/**
 * 创建播放器控制菜单
 * 根据当前播放状态创建播放、暂停、上一曲、下一曲等控制菜单项
 * @returns 播放器控制菜单项数组
 */
const createPlayerMenu = () => {
  // 创建空菜单数组，用于存放菜单项
  let menu: Electron.MenuItemConstructorOptions[] = []
  // 根据当前播放状态添加播放/暂停按钮
  menu.push(playerState.play ? {
    // 如果正在播放，显示暂停按钮
    label: i18n.getMessage('pause'), // 获取当前语言的暂停文本
    click() {
      // 点击时发送暂停命令到任务栏按钮处理函数
      sendTaskbarButtonClick('pause')
    },
  } : {
    // 如果未播放，显示播放按钮
    label: i18n.getMessage('play'), // 获取当前语言的播放文本
    click() {
      // 点击时发送播放命令到任务栏按钮处理函数
      sendTaskbarButtonClick('play')
    },
  })
  // 添加上一曲按钮
  menu.push({
    label: i18n.getMessage('prev'), // 获取当前语言的上一曲文本
    click() {
      // 点击时发送上一曲命令到任务栏按钮处理函数
      sendTaskbarButtonClick('prev')
    },
  })
  // 添加下一曲按钮
  menu.push({
    label: i18n.getMessage('next'), // 获取当前语言的下一曲文本
    click() {
      // 点击时发送下一曲命令到任务栏按钮处理函数
      sendTaskbarButtonClick('next')
    },
  })
  // 根据当前收藏状态添加收藏/取消收藏按钮
  menu.push(playerState.collect ? {
    // 如果已收藏，显示取消收藏按钮
    label: i18n.getMessage('uncollect'), // 获取当前语言的取消收藏文本
    click() {
      // 点击时发送取消收藏命令到任务栏按钮处理函数
      sendTaskbarButtonClick('unCollect')
    },
  } : {
    // 如果未收藏，显示收藏按钮
    label: i18n.getMessage('collect'), // 获取当前语言的收藏文本
    click() {
      // 点击时发送收藏命令到任务栏按钮处理函数
      sendTaskbarButtonClick('collect')
    },
  })
  // 返回创建好的菜单项数组
  return menu
}

/**
 * 创建托盘右键菜单
 * 根据当前应用状态创建完整的托盘右键菜单，包括播放控制、歌词设置和窗口管理等选项
 */
export const createMenu = () => {
  // 如果托盘不存在，直接返回
  if (!tray) return
  // 首先创建播放器控制菜单项（播放/暂停、上一曲、下一曲等）
  let menu: Electron.MenuItemConstructorOptions[] = createPlayerMenu()
  // 如果播放器处于空状态（无歌曲），禁用所有播放控制按钮
  if (playerState.empty) for (const m of menu) m.enabled = false
  // 添加分隔线
  menu.push({ type: 'separator' })
  // 添加桌面歌词开关菜单项，根据当前状态显示不同选项
  menu.push(global.lx.appSetting['desktopLyric.enable']
    ? {
        // 如果桌面歌词已启用，显示关闭选项
        label: i18n.getMessage('hide_win_lyric'), // 获取当前语言的关闭歌词文本
        click() {
          // 点击时更新配置，关闭桌面歌词
          handleUpdateConfig({ 'desktopLyric.enable': false })
        },
      }
    : {
        // 如果桌面歌词未启用，显示开启选项
        label: i18n.getMessage('show_win_lyric'), // 获取当前语言的开启歌词文本
        click() {
          // 点击时更新配置，开启桌面歌词
          handleUpdateConfig({ 'desktopLyric.enable': true })
        },
      })
  // 添加桌面歌词锁定/解锁菜单项，根据当前状态显示不同选项
  menu.push(global.lx.appSetting['desktopLyric.isLock']
    ? {
        // 如果桌面歌词已锁定，显示解锁选项
        label: i18n.getMessage('unlock_win_lyric'), // 获取当前语言的解锁歌词文本
        click() {
          // 点击时更新配置，解锁桌面歌词
          handleUpdateConfig({ 'desktopLyric.isLock': false })
        },
      }
    : {
        // 如果桌面歌词未锁定，显示锁定选项
        label: i18n.getMessage('lock_win_lyric'), // 获取当前语言的锁定歌词文本
        click() {
          // 点击时更新配置，锁定桌面歌词
          handleUpdateConfig({ 'desktopLyric.isLock': true })
        },
      })
  // 添加桌面歌词置顶/取消置顶菜单项，根据当前状态显示不同选项
  menu.push(global.lx.appSetting['desktopLyric.isAlwaysOnTop']
    ? {
        // 如果桌面歌词已置顶，显示取消置顶选项
        label: i18n.getMessage('untop_win_lyric'), // 获取当前语言的取消置顶文本
        click() {
          // 点击时更新配置，取消桌面歌词置顶
          handleUpdateConfig({ 'desktopLyric.isAlwaysOnTop': false })
        },
      }
    : {
        // 如果桌面歌词未置顶，显示置顶选项
        label: i18n.getMessage('top_win_lyric'), // 获取当前语言的置顶文本
        click() {
          // 点击时更新配置，设置桌面歌词置顶
          handleUpdateConfig({ 'desktopLyric.isAlwaysOnTop': true })
        },
      })
  // 仅在macOS平台添加状态栏歌词显示选项
  if (isMac) {
    // 添加分隔线
    menu.push({ type: 'separator' })
    // 添加状态栏歌词显示/隐藏菜单项，根据当前状态显示不同选项
    menu.push(isShowStatusBarLyric
      ? {
          // 如果状态栏歌词已显示，显示隐藏选项
          label: i18n.getMessage('hide_statusbar_lyric'), // 获取当前语言的隐藏状态栏歌词文本
          click() {
            // 点击时更新配置，隐藏状态栏歌词
            handleUpdateConfig({ 'player.isShowStatusBarLyric': false })
          },
        }
      : {
          // 如果状态栏歌词未显示，显示显示选项
          label: i18n.getMessage('show_statusbar_lyric'), // 获取当前语言的显示状态栏歌词文本
          click() {
            // 点击时更新配置，显示状态栏歌词
            handleUpdateConfig({ 'player.isShowStatusBarLyric': true })
          },
        })
  }
  // 添加分隔线
  menu.push({ type: 'separator' })
  // 如果主窗口存在，添加显示/隐藏主窗口菜单项
  if (isExistMainWindow()) {
    // 检查主窗口当前是否显示
    const isShow = isShowMainWindow()
    menu.push(isShow
      ? {
          // 如果主窗口已显示，显示隐藏选项
          label: i18n.getMessage('hide_win_main'), // 获取当前语言的隐藏主窗口文本
          click() {
            // 点击时隐藏主窗口
            hideMainWindow()
          },
        }
      : {
          // 如果主窗口未显示，显示显示选项
          label: i18n.getMessage('show_win_main'), // 获取当前语言的显示主窗口文本
          click() {
            // 点击时显示主窗口
            showMainWindow()
          },
        })
  }
  // 添加退出应用菜单项
  menu.push({
    label: i18n.getMessage('exit'), // 获取当前语言的退出文本
    click() {
      // 点击时退出应用
      quitApp()
    },
  })
  // 根据菜单项数组构建上下文菜单
  const contextMenu = Menu.buildFromTemplate(menu)
  // 设置托盘的上下文菜单
  tray.setContextMenu(contextMenu)
}
/**
 * 设置托盘图标
 * 根据主题ID更新托盘图标
 * @param themeId 主题ID
 */
export const setTrayImage = (themeId: number) => {
  // 如果托盘不存在，直接返回
  if (!tray) return
  // 根据主题ID获取图标路径，创建原生图像并设置为托盘图标
  tray.setImage(nativeImage.createFromPath(getIconPath(themeId)))
}

/**
 * 设置状态栏歌词
 * 在macOS平台的状态栏显示当前播放歌曲的歌词
 * @param lyricLineText 当前歌词行文本
 */
const setLyric = (lyricLineText?: string) => {
  // 仅当启用了状态栏歌词显示、托盘存在且歌词文本不为空时设置
  if (isShowStatusBarLyric && tray && lyricLineText != null) {
    // 设置托盘标题为当前歌词（仅macOS平台有效）
    tray.setTitle(lyricLineText)
  }
}

// 默认托盘提示文本
const defaultTip = 'LX Music'
/**
 * 设置托盘提示文本
 * 根据当前播放歌曲信息更新托盘的悬停提示文本
 */
const setTip = () => {
  // 如果托盘不存在，直接返回
  if (!tray) return

  // 获取当前播放歌曲名称
  let name = global.lx.player_status.name
  let tip: string
  if (name) {
    // 如果歌曲名称过长，截断并添加省略号
    if (name.length > 20) name = name.substring(0, 20) + '...'
    // 获取当前播放歌曲歌手
    let singer = global.lx.player_status.singer
    // 如果歌手名称过长，截断并添加省略号
    if (singer?.length > 20) singer = singer.substring(0, 20) + '...'

    // 组合提示文本，包含应用名称、歌曲名和歌手名（如果有）
    tip = `${defaultTip}\n${i18n.getMessage('music_name')}${name}${singer ? `\n${i18n.getMessage('music_singer')}${singer}` : ''}`
  } else tip = defaultTip // 如果没有歌曲信息，使用默认提示文本
  // 设置托盘的悬停提示文本
  tray.setToolTip(tip)
}

/**
 * 初始化托盘
 * 根据当前应用设置初始化或更新托盘状态，包括主题、启用状态和状态栏歌词显示
 */
const init = () => {
  // 检查托盘主题是否需要更新
  if (themeId != global.lx.appSetting['tray.themeId']) {
    // 更新主题ID
    themeId = global.lx.appSetting['tray.themeId']
    // 根据新主题ID设置托盘图标
    setTrayImage(themeId)
  }
  // 检查托盘启用状态是否需要更新
  if (isEnableTray !== global.lx.appSetting['tray.enable']) {
    // 更新托盘启用状态
    isEnableTray = global.lx.appSetting['tray.enable']
    // 根据启用状态创建或销毁托盘
    global.lx.appSetting['tray.enable'] ? createTray() : destroyTray()
  }
  // 检查状态栏歌词显示状态是否需要更新
  if (isShowStatusBarLyric !== global.lx.appSetting['player.isShowStatusBarLyric']) {
    // 更新状态栏歌词显示状态
    isShowStatusBarLyric = global.lx.appSetting['player.isShowStatusBarLyric']
    if (isShowStatusBarLyric) {
      // 如果启用了状态栏歌词，更新状态栏歌词显示（仅macOS平台有效）
      setLyric(global.lx.player_status.lyricLineText)
    } else {
      // 如果禁用了状态栏歌词，清空托盘标题
      tray?.setTitle('')
    }
  }
  // 更新托盘提示文本
  setTip()
  // 创建托盘右键菜单
  createMenu()
}

/**
 * 托盘模块初始化函数
 * 注册各种事件监听器，响应应用配置变化、窗口状态变化和播放器状态变化等事件
 * 这是模块的入口函数，在应用启动时被调用
 */
export default () => {
  // 监听配置更新事件
  global.lx.event_app.on('updated_config', (keys, setting) => {
    // 检查更新的配置项是否包含托盘相关配置
    if (!watchConfigKeys.some(key => keys.includes(key))) return

    // 如果语言设置变更，更新国际化语言
    if (keys.includes('common.langId')) i18n.setLang(setting['common.langId'])

    // 重新初始化托盘
    init()
  })

  // 监听主窗口准备显示事件
  global.lx.event_app.on('main_window_ready_to_show', () => {
    // 创建托盘菜单
    createMenu()
  })
  // 监听主窗口显示事件
  global.lx.event_app.on('main_window_show', () => {
    // 更新托盘菜单
    createMenu()
  })
  // 非Windows平台特有的窗口焦点事件处理
  if (!isWin) {
    // 监听主窗口获得焦点事件
    global.lx.event_app.on('main_window_focus', () => {
      // 更新托盘菜单
      createMenu()
    })
    // 监听主窗口失去焦点事件
    global.lx.event_app.on('main_window_blur', () => {
      // 更新托盘菜单
      createMenu()
    })
  }
  // 监听主窗口隐藏事件
  global.lx.event_app.on('main_window_hide', () => {
    // 更新托盘菜单
    createMenu()
  })
  // 监听主窗口关闭事件
  global.lx.event_app.on('main_window_close', () => {
    // 销毁托盘
    destroyTray()
  })

  // 监听应用初始化完成事件
  global.lx.event_app.on('app_inited', () => {
    // 初始化时根据配置设置语言
    i18n.setLang(global.lx.appSetting['common.langId'])
    // 初始化托盘
    init()
  })

  // 监听系统主题变化事件（仅自动主题模式生效）
  global.lx.event_app.on('system_theme_change', () => {
    // 如果不是自动主题模式，直接返回
    if (global.lx.appSetting['tray.themeId'] != TRAY_AUTO_ID) return
    // 更新托盘图标以适应新的系统主题
    setTrayImage(global.lx.appSetting['tray.themeId'])
  })

  // 监听播放器状态变化事件
  global.lx.event_app.on('player_status', (status) => {
    // 标记是否需要更新托盘菜单
    let updated = false
    // 处理播放状态变化
    if (status.status) {
      switch (status.status) {
        case 'paused': // 暂停状态
          playerState.play = false // 更新播放状态为非播放
          playerState.empty &&= false // 保持非空状态
          setLyric('') // 清空状态栏歌词
          break
        case 'error': // 错误状态
          playerState.play = false // 更新播放状态为非播放
          playerState.empty &&= false // 保持非空状态
          setLyric('') // 清空状态栏歌词
          break
        case 'playing': // 播放状态
          playerState.play = true // 更新播放状态为播放中
          playerState.empty &&= false // 保持非空状态
          // 更新状态栏歌词显示（仅macOS平台有效）
          setLyric(global.lx.player_status.lyricLineText)
          break
        case 'stoped': // 停止状态
          playerState.play &&= false // 更新播放状态为非播放
          playerState.empty = true // 设置为空状态（无歌曲）
          setLyric('') // 清空状态栏歌词
          break
      }
      updated = true // 标记需要更新托盘菜单
    } else {
      // 如果只有歌词变化，更新状态栏歌词
      setLyric(status.lyricLineText)
    }
    // 如果歌曲名称变化，更新托盘提示
    if (status.name != null) setTip()
    // 如果歌手名称变化，更新托盘提示
    if (status.singer != null) setTip()
    // 如果收藏状态变化，更新播放器状态并标记需要更新托盘菜单
    if (status.collect != null) {
      playerState.collect = status.collect
      updated = true
    }
    // 如果需要更新托盘菜单，重新初始化托盘
    if (updated) init()
  })
}
