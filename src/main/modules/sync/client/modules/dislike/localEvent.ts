/**
 * 不喜欢列表本地事件处理模块
 * 该模块负责管理本地不喜欢列表的事件监听和取消监听
 */

import { SYNC_CLOSE_CODE } from '@common/constants_sync'
import { registerDislikeActionEvent } from '@main/modules/sync/dislikeEvent'

// 存储取消本地不喜欢列表事件监听的函数
let unregisterLocalListAction: (() => void) | null

/**
 * 注册不喜欢列表事件监听
 * @param socket - 当前socket连接对象
 */
export const registerEvent = (socket: LX.Sync.Client.Socket) => {
  // 注册前先取消已存在的事件监听
  unregisterEvent()
  
  // 注册不喜欢列表动作事件监听
  unregisterLocalListAction = registerDislikeActionEvent((action) => {
    // 如果不喜欢列表模块未就绪，则不处理
    if (!socket.moduleReadys?.dislike) return
    
    // 发送同步动作到远程，如果失败则关闭连接
    void socket.remoteQueueDislike.onDislikeSyncAction(action).catch(err => {
      socket.moduleReadys.dislike = false
      socket.close(SYNC_CLOSE_CODE.failed)
      console.log(err.message)
    })
  })
}

/**
 * 取消不喜欢列表事件监听
 */
export const unregisterEvent = () => {
  unregisterLocalListAction?.()
  unregisterLocalListAction = null
}
