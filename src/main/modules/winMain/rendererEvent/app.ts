/**
 * winMain/rendererEvent/app.ts
 * 应用程序事件处理模块
 * 负责处理与应用程序窗口相关的渲染进程事件，如窗口控制、主题设置等
 */

import { app } from 'electron'
import { mainHandle, mainOn } from '@common/mainIpc'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import {
  minimize,
  maximize,
  closeWindow,
  showWindow,
  setFullScreen,
  sendEvent,
  clearCache,
  getCacheSize,
  toggleDevTools,
  setWindowBounds,
  setIgnoreMouseEvents,
  toggleMinimize,
  toggleHide,
  showSelectDialog,
  showDialog,
  showSaveDialog,
} from '@main/modules/winMain'
import { quitApp } from '@main/app'
import { getAllThemes, removeTheme, saveTheme, setPowerSaveBlocker } from '@main/utils'
import { openDirInExplorer } from '@common/utils/electron'

/**
 * 注册应用程序相关的渲染进程事件处理器
 * 处理窗口控制、应用退出、缓存管理等事件
 */
export default () => {
  // 监听退出应用事件
  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.quit, () => {
    quitApp()
  })
  
  // 监听切换窗口最小化状态事件
  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.min_toggle, () => {
    toggleMinimize()
  })
  
  // 监听切换窗口显示/隐藏状态事件
  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.hide_toggle, () => {
    toggleHide()
  })
  
  // 监听最小化窗口事件
  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.min, () => {
    minimize()
  })
  
  // 监听最大化窗口事件
  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.max, () => {
    maximize()
  })
  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.focus, () => {
    showWindow()
  })
  mainOn<boolean>(WIN_MAIN_RENDERER_EVENT_NAME.set_power_save_blocker, ({ params: enabled }) => {
    setPowerSaveBlocker(enabled)
  })
  mainOn<boolean>(WIN_MAIN_RENDERER_EVENT_NAME.close, ({ params: isForce }) => {
    if (isForce) {
      app.exit(0)
      return
    }
    closeWindow()
  })
  // 全屏
  mainHandle<boolean, boolean>(WIN_MAIN_RENDERER_EVENT_NAME.fullscreen, async({ params: isFullscreen }) => {
    global.lx.event_app.main_window_fullscreen(isFullscreen)
    return setFullScreen(isFullscreen)
  })

  // 选择目录
  mainHandle<Electron.OpenDialogOptions, Electron.OpenDialogReturnValue>(WIN_MAIN_RENDERER_EVENT_NAME.show_select_dialog, async({ params: options }) => {
    return showSelectDialog(options)
  })
  // 显示弹窗信息
  mainOn<Electron.MessageBoxSyncOptions>(WIN_MAIN_RENDERER_EVENT_NAME.show_dialog, ({ params }) => {
    showDialog(params)
  })
  // 显示保存弹窗
  mainHandle<Electron.SaveDialogOptions, Electron.SaveDialogReturnValue>(WIN_MAIN_RENDERER_EVENT_NAME.show_save_dialog, async({ params }) => {
    return showSaveDialog(params)
  })
  // 在资源管理器中定位文件
  mainOn<string>(WIN_MAIN_RENDERER_EVENT_NAME.open_dir_in_explorer, async({ params }) => {
    return openDirInExplorer(params)
  })


  mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.clear_cache, async() => {
    await clearCache()
  })

  mainHandle<number>(WIN_MAIN_RENDERER_EVENT_NAME.get_cache_size, async() => {
    return getCacheSize()
  })

  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.open_dev_tools, () => {
    toggleDevTools()
  })

  mainOn<Partial<Electron.Rectangle>>(WIN_MAIN_RENDERER_EVENT_NAME.set_window_size, ({ params }) => {
    setWindowBounds(params)
  })

  mainOn<boolean>(WIN_MAIN_RENDERER_EVENT_NAME.set_ignore_mouse_events, ({ params: isIgnored }) => {
    isIgnored
      ? setIgnoreMouseEvents(isIgnored, { forward: true })
      : setIgnoreMouseEvents(false)
  })

  // mainHandle<Electron.Rectangle>(WIN_MAIN_RENDERER_EVENT_NAME.taskbar_set_thumbnail_clip, async({ params }) => {
  //   return setThumbnailClip(params)
  // })

  mainOn<LX.Player.Status>(WIN_MAIN_RENDERER_EVENT_NAME.player_status, ({ params }) => {
    // setThumbarButtons(params)
    global.lx.event_app.player_status(params)
  })

  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.inited, () => {
    global.lx.event_app.main_window_inited()
  })

  mainHandle<{ themes: LX.Theme[], userThemes: LX.Theme[] }>(WIN_MAIN_RENDERER_EVENT_NAME.get_themes, async() => {
    return getAllThemes()
  })
  mainHandle<LX.Theme>(WIN_MAIN_RENDERER_EVENT_NAME.save_theme, async({ params: theme }) => {
    saveTheme(theme)
  })
  mainHandle<string>(WIN_MAIN_RENDERER_EVENT_NAME.remove_theme, async({ params: id }) => {
    removeTheme(id)
  })
}

export const sendFocus = () => {
  sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.focus)
}

export const sendTaskbarButtonClick = (action: LX.Player.StatusButtonActions) => {
  sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.player_action_on_button_click, action)
}
export const sendConfigChange = (setting: Partial<LX.AppSetting>) => {
  sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.on_config_change, setting)
}
