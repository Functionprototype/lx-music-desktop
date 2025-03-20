/**
 * @file 桌面歌词配置管理模块
 * @description 负责管理桌面歌词窗口的配置，处理配置变更并应用到歌词窗口
 */

import { isLinux } from '@common/utils'
import { closeWindow, createWindow, getBounds, isExistWindow, alwaysOnTopTools, setBounds, setIgnoreMouseEvents, setSkipTaskbar } from './main'
import { sendConfigChange } from './rendererEvent'
import { buildLyricConfig, getLyricWindowBounds, initWindowSize, watchConfigKeys } from './utils'

// 缓存当前桌面歌词的状态，用于检测配置变化
let isLock: boolean // 是否锁定歌词窗口
let isEnable: boolean // 是否启用桌面歌词
let isAlwaysOnTop: boolean // 是否置顶歌词窗口
let isAlwaysOnTopLoop: boolean // 是否循环刷新置顶状态
let isShowTaskbar: boolean // 是否在任务栏显示
let isLockScreen: boolean // 是否锁定在屏幕内
let isHoverHide: boolean // 鼠标悬停时是否降低透明度


/**
 * 设置桌面歌词配置
 * @description 处理桌面歌词配置变更，并将变更应用到歌词窗口
 * @param keys 变更的配置键名数组
 * @param setting 变更的配置对象
 */
export const setLrcConfig = (keys: Array<keyof LX.AppSetting>, setting: Partial<LX.AppSetting>) => {
  // 如果变更的配置键不在监听列表中，则不处理
  if (!watchConfigKeys.some(key => keys.includes(key))) return

  if (isExistWindow()) {
    // 向歌词窗口发送配置变更事件
    sendConfigChange(buildLyricConfig(setting))
    
    // 处理锁定状态变更
    if (keys.includes('desktopLyric.isLock') && isLock != global.lx.appSetting['desktopLyric.isLock']) {
      isLock = global.lx.appSetting['desktopLyric.isLock']
      if (global.lx.appSetting['desktopLyric.isLock']) {
        // 锁定状态：忽略鼠标事件，Linux系统下不支持forward选项
        setIgnoreMouseEvents(true, { forward: !isLinux && global.lx.appSetting['desktopLyric.isHoverHide'] })
      } else {
        // 非锁定状态：接收鼠标事件
        setIgnoreMouseEvents(false, { forward: !isLinux && global.lx.appSetting['desktopLyric.isHoverHide'] })
      }
    }
    
    // 处理鼠标悬停隐藏状态变更
    if (keys.includes('desktopLyric.isHoverHide') && isHoverHide != global.lx.appSetting['desktopLyric.isHoverHide']) {
      isHoverHide = global.lx.appSetting['desktopLyric.isHoverHide']
      if (!isLinux) { // Linux系统不支持forward选项
        setIgnoreMouseEvents(global.lx.appSetting['desktopLyric.isLock'], { forward: global.lx.appSetting['desktopLyric.isHoverHide'] })
      }
    }
    
    // 处理窗口置顶状态变更
    if (keys.includes('desktopLyric.isAlwaysOnTop') && isAlwaysOnTop != global.lx.appSetting['desktopLyric.isAlwaysOnTop']) {
      isAlwaysOnTop = global.lx.appSetting['desktopLyric.isAlwaysOnTop']
      alwaysOnTopTools.setAlwaysOnTop(global.lx.appSetting['desktopLyric.isAlwaysOnTopLoop'])
      if (isAlwaysOnTop && global.lx.appSetting['desktopLyric.isAlwaysOnTopLoop']) {
        // 如果开启了置顶且开启了循环刷新置顶，则启动循环
        alwaysOnTopTools.startLoop()
      } else alwaysOnTopTools.clearLoop()
    }
    
    // 处理任务栏显示状态变更
    if (keys.includes('desktopLyric.isShowTaskbar') && isShowTaskbar != global.lx.appSetting['desktopLyric.isShowTaskbar']) {
      isShowTaskbar = global.lx.appSetting['desktopLyric.isShowTaskbar']
      setSkipTaskbar(!global.lx.appSetting['desktopLyric.isShowTaskbar'])
    }
    
    // 处理循环刷新置顶状态变更
    if (keys.includes('desktopLyric.isAlwaysOnTopLoop') && isAlwaysOnTopLoop != global.lx.appSetting['desktopLyric.isAlwaysOnTopLoop']) {
      isAlwaysOnTopLoop = global.lx.appSetting['desktopLyric.isAlwaysOnTopLoop']
      if (!global.lx.appSetting['desktopLyric.isAlwaysOnTop']) return
      if (isAlwaysOnTopLoop) {
        alwaysOnTopTools.startLoop()
      } else {
        alwaysOnTopTools.clearLoop()
      }
    }
    
    // 处理锁定屏幕状态变更
    if (keys.includes('desktopLyric.isLockScreen') && isLockScreen != global.lx.appSetting['desktopLyric.isLockScreen']) {
      isLockScreen = global.lx.appSetting['desktopLyric.isLockScreen']
      if (global.lx.appSetting['desktopLyric.isLockScreen']) {
        // 锁定屏幕时，重新设置窗口边界，确保窗口在屏幕内
        setBounds(getLyricWindowBounds(getBounds(), {
          x: 0,
          y: 0,
          w: global.lx.appSetting['desktopLyric.width'],
          h: global.lx.appSetting['desktopLyric.height'],
        }))
      }
    }
    
    // 处理窗口位置变更
    if (keys.includes('desktopLyric.x') && setting['desktopLyric.x'] == null) {
      setBounds(initWindowSize(
        global.lx.appSetting['desktopLyric.x'],
        global.lx.appSetting['desktopLyric.y'],
        global.lx.appSetting['desktopLyric.width'],
        global.lx.appSetting['desktopLyric.height'],
      ))
    }
  }
  
  // 处理桌面歌词启用状态变更
  if (keys.includes('desktopLyric.enable') && isEnable != global.lx.appSetting['desktopLyric.enable']) {
    isEnable = global.lx.appSetting['desktopLyric.enable']
    if (global.lx.appSetting['desktopLyric.enable']) {
      // 启用桌面歌词时创建窗口
      createWindow()
    } else {
      // 禁用桌面歌词时清除置顶循环并关闭窗口
      alwaysOnTopTools.clearLoop()
      closeWindow()
    }
  }
}
