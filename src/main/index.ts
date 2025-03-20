/**
 * index.ts
 * 主进程入口文件
 * 负责应用程序的初始化流程，包括全局数据初始化、单例处理、环境配置、用户数据路径设置、深度链接注册和模块注册等
 */

import { app } from 'electron'
import './utils/logInit' // 初始化日志系统
import '@common/error' // 导入错误处理
import {
  initGlobalData,          // 初始化全局数据
  initSingleInstanceHandle, // 初始化单例应用处理
  applyElectronEnvParams,   // 应用Electron环境参数
  setUserDataPath,          // 设置用户数据路径
  registerDeeplink,         // 注册深度链接处理
  listenerAppEvent,         // 监听应用事件
} from './app'
import { isLinux } from '@common/utils' // 导入平台检测工具
import { initAppSetting } from '@main/app' // 导入应用设置初始化函数
import registerModules from '@main/modules' // 导入模块注册函数

/**
 * 初始化应用程序
 * 加载应用设置、注册功能模块并触发应用初始化完成事件
 */
const init = () => {
  console.log('init')
  void initAppSetting().then(() => {
    // 注册应用功能模块（如播放器、下载管理、同步服务等）
    registerModules()
    // 触发应用初始化完成事件，通知各模块可以开始工作
    global.lx.event_app.app_inited()
  })
}

// 执行初始化流程
initGlobalData()              // 初始化全局数据
initSingleInstanceHandle()    // 确保应用只有一个实例在运行
applyElectronEnvParams()      // 应用Electron环境参数
setUserDataPath()             // 设置用户数据路径
registerDeeplink(init)        // 注册深度链接处理
listenerAppEvent(init)        // 监听应用事件


// 应用就绪后启动初始化流程
// 修复Linux平台上的问题：https://github.com/electron/electron/issues/16809
void app.whenReady().then(() => {
  // Linux平台上延迟300ms初始化，避免某些问题
  isLinux ? setTimeout(init, 300) : init()
})
