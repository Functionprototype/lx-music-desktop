// 窗口渲染进程事件注册器
// 负责Deeplink事件和主题变更事件的注册与清理
import { CMMON_EVENT_NAME } from '@common/ipcNames'

// 发送列表操作事件到渲染进程的注册方法
// 哪个渲染进程需要接收则引入此方法注册
export const registerRendererEvents = (sendEvent: <T = any>(name: string, params?: T | undefined) => void) => {
  // 初始化Deeplink和系统主题变更事件监听
  // Deeplink事件转发处理函数
const sendDeeplink = (link: string) => {
    sendEvent(CMMON_EVENT_NAME.deeplink, link)
  }
  // 系统主题变更事件转发处理函数
const sendSystemThemeChange = () => {
    sendEvent(CMMON_EVENT_NAME.theme_change, global.lx.theme)
  }

  // 注册Deeplink全局事件监听
global.lx.event_app.on('deeplink', sendDeeplink)
  // 注册系统主题变更全局事件监听
global.lx.event_app.on('theme_change', sendSystemThemeChange)

  // 返回取消注册事件的清理函数
return () => {
    // 移除Deeplink事件监听
global.lx.event_app.off('deeplink', sendDeeplink)
    // 移除系统主题变更事件监听
global.lx.event_app.off('theme_change', sendSystemThemeChange)
  }
}

