import { registerRendererEvents as common } from '@main/modules/commonRenderers/common'
import { mainOn, mainHandle } from '@common/mainIpc'
import { WIN_LYRIC_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { buildLyricConfig, getLyricWindowBounds } from './utils'
import { sendNewDesktopLyricClient } from '@main/modules/winMain'
import { getBounds, getMainFrame, sendEvent, setBounds } from './main'
import { MessageChannelMain } from 'electron'


/**
 * 初始化桌面歌词渲染进程事件处理
 * @description 注册桌面歌词窗口与主进程通信的IPC事件处理函数
 */
export default () => {
  // mainOn(WIN_LYRIC_RENDERER_EVENT_NAME.get_lyric_info, ({ params: action }) => {
  //   sendMainEvent(WIN_MAIN_RENDERER_EVENT_NAME.get_lyric_info, {
  //     name: WIN_LYRIC_RENDERER_EVENT_NAME.set_lyric_info,
  //     modal: 'lyricWindow',
  //     action,
  //   })
  // })
  
  // 注册通用渲染进程事件处理
  common(sendEvent)

  // 处理设置配置事件
  mainHandle<Partial<LX.AppSetting>>(WIN_LYRIC_RENDERER_EVENT_NAME.set_config, async({ params: config }) => {
    global.lx.event_app.update_config(config)
  })

  // 处理获取配置事件
  mainHandle<LX.DesktopLyric.Config>(WIN_LYRIC_RENDERER_EVENT_NAME.get_config, async() => {
    return buildLyricConfig(global.lx.appSetting) as LX.DesktopLyric.Config
  })

  // 处理设置窗口边界事件
  mainOn<LX.DesktopLyric.NewBounds>(WIN_LYRIC_RENDERER_EVENT_NAME.set_win_bounds, ({ params: options }) => {
    setBounds(getLyricWindowBounds(getBounds(), options))
  })

  // 处理请求主窗口通信通道事件
  mainOn(WIN_LYRIC_RENDERER_EVENT_NAME.request_main_window_channel, ({ event }) => {
    // 确保请求来自主框架
    if (event.senderFrame !== getMainFrame()) return
    // 创建一个新的消息通道
    const { port1, port2 } = new MessageChannelMain()
    // 将一端发送给主窗口
    sendNewDesktopLyricClient(port1)
    // 将另一端发送给歌词窗口
    event.senderFrame.postMessage(WIN_LYRIC_RENDERER_EVENT_NAME.provide_main_window_channel, null, [port2])
    // 现在主窗口和歌词窗口可以直接通信，无需通过主进程
    console.log('request_main_window_channel')
  })
}

/**
 * 发送配置变更事件到桌面歌词窗口
 * @param setting 变更的配置对象
 */
export const sendConfigChange = (setting: Partial<LX.DesktopLyric.Config>) => {
  sendEvent(WIN_LYRIC_RENDERER_EVENT_NAME.on_config_change, setting)
}

/**
 * 发送主窗口初始化完成事件到桌面歌词窗口
 */
export const sendMainWindowInitedEvent = () => {
  sendEvent(WIN_LYRIC_RENDERER_EVENT_NAME.main_window_inited)
}

