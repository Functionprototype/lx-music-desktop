/**
 * 本模块负责管理本地同步事件的注册和注销
 * 主要用于处理服务端与客户端之间的数据同步事件
 */

import { modules } from '../../modules'

/**
 * 注册本地同步事件
 * @param wss WebSocket服务器实例，用于建立与客户端的实时通信
 */
export const registerLocalSyncEvent = async(wss: LX.Sync.Server.SocketServer) => {
  // 先注销已存在的事件监听，避免重复注册
  unregisterLocalSyncEvent()
  // 遍历所有模块，为每个模块注册同步事件
  for (const module of Object.values(modules)) {
    module.registerEvent(wss)
  }
}

/**
 * 注销所有本地同步事件
 * 用于清理事件监听，防止内存泄漏
 */
export const unregisterLocalSyncEvent = () => {
  // 遍历所有模块，注销每个模块的事件监听
  for (const module of Object.values(modules)) {
    module.unregisterEvent()
  }
}
