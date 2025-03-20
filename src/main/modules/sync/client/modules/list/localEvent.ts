/**
 * @file 客户端列表本地事件管理模块
 * 该模块负责管理本地列表变更事件的注册和注销，以及将本地变更同步到远程服务器
 */

import { SYNC_CLOSE_CODE } from '@common/constants_sync'
import { registerListActionEvent } from '@main/modules/sync/listEvent'

// 存储本地列表操作事件的注销函数
let unregisterLocalListAction: (() => void) | null

/**
 * 注册本地列表变更事件监听
 * @param socket 当前的Socket连接实例
 */
export const registerEvent = (socket: LX.Sync.Client.Socket) => {
  // 注销之前的事件监听（如果存在）
  unregisterEvent()
  // 注册新的列表操作事件监听
  unregisterLocalListAction = registerListActionEvent((action) => {
    // 如果列表模块未就绪，则不处理
    if (!socket.moduleReadys?.list) return
    // 将本地列表变更同步到远程服务器
    void socket.remoteQueueList.onListSyncAction(action).catch(err => {
      // 同步失败时，标记列表模块为未就绪状态
      socket.moduleReadys.list = false
      // 关闭连接并返回失败状态码
      socket.close(SYNC_CLOSE_CODE.failed)
      console.log(err.message)
    })
  })
}

/**
 * 注销本地列表变更事件监听
 */
export const unregisterEvent = () => {
  unregisterLocalListAction?.()
  unregisterLocalListAction = null
}
