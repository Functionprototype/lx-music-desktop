/**
 * @file 桌面歌词模块入口
 * @description 负责初始化桌面歌词模块，处理与主窗口的交互和热键事件
 */

import { APP_EVENT_NAMES } from '@common/constants'
import initRendererEvent, { sendMainWindowInitedEvent } from './rendererEvent'
import { setLrcConfig } from './config'
import { HOTKEY_DESKTOP_LYRIC } from '@common/hotKey'
import { closeWindow, createWindow, isExistWindow } from './main'
// import main from './main'
// import { Event, EVENT_NAMES } from './event'

// 记录主窗口是否处于全屏状态
let isMainWidnowFullscreen = false

/**
 * 桌面歌词模块初始化函数
 * @description 初始化渲染进程事件处理，注册应用事件监听
 */
export default () => {
  // 初始化渲染进程事件处理
  initRendererEvent()
  // global.lx.event_app.winLyric = new Event()
  // global.app_event.winMain.

  // 监听主窗口初始化完成事件
  global.lx.event_app.on('main_window_inited', () => {
    // 获取主窗口初始全屏状态
    isMainWidnowFullscreen = global.lx.appSetting['common.startInFullscreen']

    // 如果启用了桌面歌词
    if (global.lx.appSetting['desktopLyric.enable']) {
      // 如果设置了全屏隐藏且主窗口处于全屏状态，则关闭歌词窗口
      if (global.lx.appSetting['desktopLyric.fullscreenHide'] && isMainWidnowFullscreen) {
        closeWindow()
      } else {
        // 否则，如果歌词窗口已存在则发送主窗口初始化事件，否则创建歌词窗口
        if (isExistWindow()) sendMainWindowInitedEvent()
        else createWindow()
      }
    }
  })
  
  // 监听配置更新事件
  global.lx.event_app.on('updated_config', (keys, setting) => {
    // 更新歌词配置
    setLrcConfig(keys, setting)
    // 处理全屏隐藏设置变更
    if (keys.includes('desktopLyric.fullscreenHide') && global.lx.appSetting['desktopLyric.enable'] && isMainWidnowFullscreen) {
      if (global.lx.appSetting['desktopLyric.fullscreenHide']) closeWindow()
      else if (!isExistWindow()) createWindow()
    }
  })
  
  // 监听主窗口关闭事件
  global.lx.event_app.on('main_window_close', () => {
    closeWindow()
  })
  
  // 监听主窗口全屏状态变化事件
  global.lx.event_app.on('main_window_fullscreen', (isFullscreen) => {
    // 更新主窗口全屏状态
    isMainWidnowFullscreen = isFullscreen
    // 如果启用了桌面歌词且设置了全屏隐藏
    if (global.lx.appSetting['desktopLyric.enable'] && global.lx.appSetting['desktopLyric.fullscreenHide']) {
      // 根据全屏状态决定是关闭还是创建歌词窗口
      if (isFullscreen) closeWindow()
      else if (!isExistWindow()) createWindow()
    }
  })


  // global.lx_event.mainWindow.on(MAIN_WINDOW_EVENT_NAME.setLyricInfo, info => {
  //   if (!global.modules.lyricWindow) return
  //   mainSend(global.modules.lyricWindow, ipcWinLyricNames.set_lyric_info, info)
  // })

  // 监听全局热键按下事件
  global.lx.event_app.on('hot_key_down', ({ type, key }) => {
    // 获取热键配置信息
    let info = global.lx.hotKey.config.global.keys[key]
    // 如果热键不存在或类型不是桌面歌词相关，则忽略
    if (!info || info.type != APP_EVENT_NAMES.winLyricName) return
    
    // 准备更新的设置对象
    let newSetting: Partial<LX.AppSetting> = {}
    let settingKey: keyof LX.AppSetting
    
    // 根据热键动作类型设置对应的配置键
    switch (info.action) {
      case HOTKEY_DESKTOP_LYRIC.toggle_visible.action: // 切换桌面歌词显示/隐藏
        settingKey = 'desktopLyric.enable'
        break
      case HOTKEY_DESKTOP_LYRIC.toggle_lock.action: // 切换桌面歌词锁定/解锁
        settingKey = 'desktopLyric.isLock'
        break
      case HOTKEY_DESKTOP_LYRIC.toggle_always_top.action: // 切换桌面歌词置顶/取消置顶
        settingKey = 'desktopLyric.isAlwaysOnTop'
        break
      default: return
    }
    
    // 切换设置值（取反）
    newSetting[settingKey] = !global.lx.appSetting[settingKey]

    // 更新配置
    global.lx.event_app.update_config(newSetting)
  })
}

// 导出main.ts和rendererEvent.ts中的函数和变量
export * from './main'
export * from './rendererEvent'

// export {
//   EVENT_NAMES,
// }
