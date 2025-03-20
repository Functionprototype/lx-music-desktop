/**
 * modules/index.ts
 * 应用程序模块注册入口文件
 * 负责注册和初始化应用程序的各个功能模块，包括用户API、主窗口、热键、托盘、应用菜单、歌词窗口等
 */

import registerUserApi from './userApi' // 导入用户API注册函数
import registerWinMain from './winMain' // 导入主窗口注册函数
import registerHotKey from './hotKey' // 导入热键注册函数
import registerTray from './tray' // 导入系统托盘注册函数
import registerAppMenu from './appMenu' // 导入应用菜单注册函数
import registerWinLyric from './winLyric' // 导入歌词窗口注册函数
import registerCommonRenderers from './commonRenderers' // 导入通用渲染器注册函数

// 模块注册状态标志，确保模块只被注册一次
let isRegistered = false

/**
 * 注册所有应用程序模块
 * 按照特定顺序初始化各个功能模块，确保应用程序正常运行
 */
export default () => {
  if (isRegistered) return // 如果已经注册过，则直接返回
  registerUserApi() // 注册用户API模块，处理用户自定义脚本和插件
  registerCommonRenderers() // 注册通用渲染器，处理公共的渲染进程通信
  registerWinMain() // 注册主窗口模块，创建和管理应用主界面
  registerHotKey() // 注册热键模块，处理全局和本地快捷键
  registerTray() // 注册系统托盘模块，提供系统托盘图标和菜单
  registerAppMenu() // 注册应用菜单模块，创建应用程序菜单
  registerWinLyric() // 注册歌词窗口模块，显示桌面歌词
  isRegistered = true // 设置注册状态为已完成
}
