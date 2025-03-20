/**
 * winMain/rendererEvent/hotKey.ts
 * 热键事件处理模块
 * 负责处理与热键相关的渲染进程事件，包括获取热键配置、处理热键按下事件等
 */

import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames' // 导入渲染进程事件名称常量
import { mainHandle } from '@common/mainIpc' // 导入主进程IPC通信工具
import { sendEvent } from '../main' // 导入事件发送工具
// import getStore from '@common/store' // 导入存储工具（已注释）


// const { registerHotkey, unRegisterHotkey } = require('../modules/hotKey/utils')

// mainHandle(ipcMainWindowNames.set_hot_key_config, async(event, { action, data }) => {
//   switch (action) {
//     case 'config':
//       global.lx_event.hotKey.saveConfig(data.data, MAIN_WINDOW_EVENT_NAME.source)
//       return
//     case 'register':
//       return registerHotkey(data)
//     case 'unregister':
//       return unRegisterHotkey(data)
//   }
// })

/**
 * 初始化热键事件处理
 * 注册获取热键配置的处理器
 */
export default () => {
  // 处理获取热键配置请求
  mainHandle<LX.HotKeyConfigAll>(WIN_MAIN_RENDERER_EVENT_NAME.get_hot_key, async() => {
    // const electronStore_hotKey = getStore('hotKey') // 从存储获取热键配置（已注释）
    // 返回当前热键配置
    return {
      local: global.lx.hotKey?.config.local,  // 本地热键配置
      global: global.lx.hotKey?.config.global, // 全局热键配置
    }
  })

  // 监听热键配置更新事件（已注释）
  // global.lx.event_app.on(APP_EVENT_NAMES.hotKeyConfig, (config, source) => {
  //   if (!global.modules.mainWindow || source === MAIN_WINDOW_EVENT_NAME.name) return
  //   mainSend(global.modules.mainWindow, WIN_MAIN_RENDERER_EVENT_NAME.set_hot_key_config, { config, source })
  // })
}

/**
 * 处理热键按下事件
 * 将热键按下事件发送到渲染进程
 * @param type 热键类型
 * @param key 热键键值
 */
export const handleKeyDown = (type: string, key: string) => {
  sendEvent<LX.HotKeyEvent>(WIN_MAIN_RENDERER_EVENT_NAME.key_down, { type, key })
}

/**
 * 热键配置更新
 * 将更新后的热键配置发送到渲染进程
 * @param config 热键配置对象
 */
export const hotKeyConfigUpdate = (config: LX.HotKeyConfigAll) => {
  sendEvent<LX.HotKeyConfigAll>(WIN_MAIN_RENDERER_EVENT_NAME.set_hot_key_config, config)
}
