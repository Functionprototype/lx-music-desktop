/**
 * winMain/rendererEvent/index.ts
 * 渲染进程事件处理模块入口
 * 负责注册和管理主窗口与渲染进程之间的通信事件
 */

// 导入通用渲染进程事件处理模块
import { registerRendererEvents as common } from '@main/modules/commonRenderers/common'
import { registerRendererEvents as list } from '@main/modules/commonRenderers/list'
import { registerRendererEvents as dislike } from '@main/modules/commonRenderers/dislike'

// 导入各功能模块的事件处理器
import app, { sendConfigChange } from './app'
import hotKey from './hotKey'
import kw_decodeLyric from './kw_decodeLyric'
import tx_decodeLyric from './tx_decodeLyric'
import userApi from './userApi'
import sync from './sync'
import data from './data'
import music from './music'
import download from './download'
import soundEffect from './soundEffect'
import openAPI from './openAPI'
import { sendEvent } from '../main'

// 导出各模块的公共接口，方便其他模块调用
export * from './app'
export * from './hotKey'
export * from './userApi'
export * from './sync'
export * from './process'

// 初始化标志，防止重复初始化
let isInitialized = false

/**
 * 初始化渲染进程事件处理
 * 注册所有与渲染进程通信的事件处理器
 */
export default () => {
  // 如果已经初始化过，则直接返回
  if (isInitialized) return
  isInitialized = true

  // 注册通用渲染进程事件处理器
  common(sendEvent)
  list(sendEvent)
  dislike(sendEvent)
  
  // 注册主窗口特定的事件处理器
  app()               // 应用程序相关事件
  hotKey()            // 热键相关事件
  kw_decodeLyric()    // 酷我歌词解码事件
  tx_decodeLyric()    // 腾讯歌词解码事件
  userApi()           // 用户API相关事件
  sync()              // 同步相关事件
  data()              // 数据存储相关事件
  music()             // 音乐播放相关事件
  download()          // 下载相关事件
  soundEffect()       // 音效相关事件
  openAPI()           // 开放API相关事件

  // 监听配置更新事件，将更新后的配置发送到渲染进程
  global.lx.event_app.on('updated_config', (keys, setting) => {
    sendConfigChange(setting)
  })
}

