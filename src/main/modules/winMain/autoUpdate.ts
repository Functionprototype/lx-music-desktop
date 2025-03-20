/**
 * winMain/autoUpdate.ts
 * 自动更新模块
 * 负责检查、下载和安装应用程序更新，并与渲染进程通信更新状态
 */

import { autoUpdater } from 'electron-updater' // 导入electron-updater的自动更新器
import { log, isWin } from '@common/utils' // 导入日志工具和系统平台判断工具
import { mainOn } from '@common/mainIpc' // 导入主进程IPC通信工具
import { isExistWindow, sendEvent } from './index' // 导入窗口状态检查和事件发送工具
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames' // 导入IPC事件名称常量

// 设置自动更新器的日志记录器
autoUpdater.logger = log
// 禁用自动下载更新，改为手动触发下载
autoUpdater.autoDownload = false
// autoUpdater.forceDevUpdateConfig = true  // 强制使用开发配置（已注释）
// autoUpdater.autoDownload = false         // 重复设置（已注释）

// let isFirstCheckedUpdate = true          // 是否首次检查更新标志（已注释）

// 记录应用启动日志
log.info('App starting...')


// -------------------------------------------------------------------
// 打开一个显示版本的窗口
//
// 此部分不是必需的
//
// 这对于自动更新功能来说不是必需的，但通过窗口显示比点击"关于"查看更新状态更方便。
// -------------------------------------------------------------------
// let win  // 窗口引用（未使用）

/**
 * 向窗口发送状态信息
 * 将更新状态记录到日志中，方便调试和跟踪更新过程
 * @param text 状态文本信息
 */
function sendStatusToWindow(text: string) {
  log.info(text)  // 记录信息到日志
  // ipcMain.send('message', text)  // 发送消息到渲染进程（已注释）
}


// -------------------------------------------------------------------
// 自动更新
//
// 关于这些事件的详细信息，请参阅Wiki：
// https://github.com/electron-userland/electron-builder/wiki/Auto-Update#events
//
// 应用程序只需要监听 `update-downloaded` 事件即可实现基本更新功能
//
// 取消注释下面的任何事件以监听它们。另外，
// 查看前一部分以了解它们的使用方式。
// -------------------------------------------------------------------
// autoUpdater.on('checking-for-update', () => {  // 检查更新开始事件
// })
// autoUpdater.on('update-available', (ev, info) => {  // 有可用更新事件
// })
// autoUpdater.on('update-not-available', (ev, info) => {  // 无可用更新事件
// })
// autoUpdater.on('error', (ev, err) => {  // 更新错误事件
// })
// autoUpdater.on('download-progress', (ev, progressObj) => {  // 下载进度事件
// })
// autoUpdater.on('update-downloaded', (ev, info) => {  // 更新下载完成事件
//   // 等待5秒，然后退出并安装
//   // 在实际应用中，不需要等待5秒
//   // 可以立即调用 autoUpdater.quitAndInstall()
//   // setTimeout(function() {
//   // autoUpdater.quitAndInstall()
//   // }, 5000)
// })

/**
 * 等待事件接口
 * 定义需要发送到渲染进程的事件结构
 */
interface WaitEvent {
  type: string  // 事件类型
  info: any     // 事件附带信息
}

// let waitEvent: WaitEvent[] = []  // 等待事件队列（已注释）

/**
 * 处理事件发送
 * 将更新事件发送到渲染进程，确保窗口存在且延迟发送以避免渲染进程未准备好
 * @param action 需要发送的事件对象
 */
const handleSendEvent = (action: WaitEvent) => {
  if (isExistWindow()) {
    setTimeout(() => { // 延迟发送事件，过早发送可能渲染进程还没启动完成
      sendEvent(action.type, action.info)
    }, 1000)
  }
}

/**
 * 初始化自动更新模块
 * 设置更新事件监听和处理逻辑，包括检查更新、下载更新和安装更新的事件处理
 */
export default () => {
  // 监听更新检查开始事件
  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for update...')  // 记录正在检查更新
  })
  
  // 监听更新可用事件
  autoUpdater.on('update-available', info => {
    sendStatusToWindow('Update available.')  // 记录有可用更新
    // 向渲染进程发送更新可用事件和更新信息
    handleSendEvent({ type: WIN_MAIN_RENDERER_EVENT_NAME.update_available, info })
  })
  
  // 监听无可用更新事件
  autoUpdater.on('update-not-available', info => {
    sendStatusToWindow('Update not available.')  // 记录无可用更新
    // 向渲染进程发送无可用更新事件和相关信息
    handleSendEvent({ type: WIN_MAIN_RENDERER_EVENT_NAME.update_not_available, info })
  })
  
  // 监听更新错误事件
  autoUpdater.on('error', err => {
    sendStatusToWindow('Error in auto-updater.')  // 记录更新器错误
    // 向渲染进程发送更新错误事件和错误信息
    handleSendEvent({ type: WIN_MAIN_RENDERER_EVENT_NAME.update_error, info: err.message })
  })
  
  // 监听下载进度事件
  autoUpdater.on('download-progress', progressObj => {
    // 构建下载进度日志信息
    let log_message = `Download speed: ${progressObj.bytesPerSecond}`  // 下载速度
    log_message = `${log_message} - Downloaded ${progressObj.percent}%`  // 下载百分比
    log_message = `${log_message} (progressObj.transferred/${progressObj.total})`  // 已传输/总大小
    sendStatusToWindow(log_message)  // 记录下载进度
    // 向渲染进程发送下载进度事件和进度信息
    handleSendEvent({ type: WIN_MAIN_RENDERER_EVENT_NAME.update_progress, info: progressObj })
  })
  
  // 监听更新下载完成事件
  autoUpdater.on('update-downloaded', info => {
    sendStatusToWindow('Update downloaded.')  // 记录更新已下载
    // 向渲染进程发送更新下载完成事件和相关信息
    handleSendEvent({ type: WIN_MAIN_RENDERER_EVENT_NAME.update_downloaded, info })
  })

  // 监听来自渲染进程的检查更新请求
  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.update_check, () => {
    console.log('check')  // 控制台记录检查更新请求
    checkUpdate()  // 执行检查更新
  })

  // 监听来自渲染进程的下载更新请求
  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.update_download_update, () => {
    // 如果更新器未激活，则直接返回
    if (!autoUpdater.isUpdaterActive()) return
    // 开始下载更新
    void autoUpdater.downloadUpdate()
  })

  // 监听来自渲染进程的退出并安装更新请求
  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.quit_update, () => {
       global.lx.isSkipTrayQuit = true

    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true)
    }, 1000)
  })
}
    // 设置跳过托盘退出标志，确保应用直接退出而不是最小化到托盘

/**
 * 检查更新函数
 * 检查应用程序是否有可用更新，并处理特殊平台的兼容性问题
 */
const checkUpdate = () => {
  // if (!isFirstCheckedUpdate) {
  //   if (waitEvent.length) {
  //     waitEvent.forEach((event, index) => {
  //       setTimeout(() => { // 延迟发送事件，过早发送可能渲染进程还没启动完成
  //         sendEvent(event.type, event.info)
  //       }, 2000 * (index + 1))
  //     })
  //     waitEvent = []
  //   }
  //   return
  // }
  // isFirstCheckedUpdate = false

  // 由于集合安装包中不包含win arm版，这将会导致arm版更新失败
  if (isWin && process.arch.includes('arm')) {
    // 对于Windows ARM版本，直接发送更新错误事件
    handleSendEvent({ type: WIN_MAIN_RENDERER_EVENT_NAME.update_error, info: 'failed' })
  } else {
    // 根据用户设置决定是否自动下载更新
    autoUpdater.autoDownload = global.lx.appSetting['common.tryAutoUpdate']
    // 开始检查更新
    void autoUpdater.checkForUpdates()
  }
}
