/**
 * modules/hotKey/index.ts
 * 热键模块入口文件
 * 负责注册应用程序的热键功能，包括全局热键和应用内热键的管理
 */

import { app } from 'electron' // 导入Electron应用程序模块
import { unRegisterHotkeyAll } from './utils' // 导入热键注销工具函数

import init from './rendererEvent' // 导入渲染进程事件初始化函数

/**
 * 注册热键模块
 * 设置应用退出时的热键清理，并初始化热键相关的渲染进程事件
 */
export default () => {
  // 注册应用退出前的回调，确保所有热键被正确注销
  app.on('will-quit', unRegisterHotkeyAll)
  // 初始化热键相关的渲染进程事件处理
  init()
}
