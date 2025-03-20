// 导入必要的模块和常量
import { SYNC_CLOSE_CODE } from '@common/constants_sync'
import { registerDislikeActionEvent } from '../../../../dislikeEvent'
import { getUserSpace } from '../../../user'

// 存储取消注册事件的函数
let unregisterLocalListAction: (() => void) | null

/**
 * 向所有已连接的客户端广播不喜欢列表的同步操作
 * @param wss WebSocket服务器实例
 * @param action 不喜欢列表的操作数据
 */
const sendListAction = async(wss: LX.Sync.Server.SocketServer, action: LX.Sync.Dislike.ActionList) => {
  // 获取用户空间实例
  const userSpace = getUserSpace()
  let key = ''
  
  // 遍历所有已连接的客户端
  for (const client of wss.clients) {
    // 跳过未准备好不喜欢模块的客户端
    if (!client.moduleReadys?.dislike) continue
    
    // 创建快照，确保所有客户端同步到相同的状态
    if (!key) key = await userSpace.dislikeManage.createSnapshot()
    
    // 向客户端发送同步操作
    void client.remoteQueueDislike.onDislikeSyncAction(action).then(async() => {
      // 更新客户端的快照键值
      return userSpace.dislikeManage.updateDeviceSnapshotKey(client.keyInfo.clientId, key)
    }).catch(err => {
      // 同步失败时关闭连接
      client.close(SYNC_CLOSE_CODE.failed)
      console.log(err.message)
    })
  }
}

/**
 * 注册不喜欢列表的本地事件处理
 * @param wss WebSocket服务器实例
 */
export const registerEvent = (wss: LX.Sync.Server.SocketServer) => {
  // 清理之前的事件注册
  unregisterEvent()
  
  // 注册新的事件处理
  unregisterLocalListAction = registerDislikeActionEvent((action) => {
    void sendListAction(wss, action)
  })
}

/**
 * 清理不喜欢列表的事件注册
 */
export const unregisterEvent = () => {
  unregisterLocalListAction?.()
  unregisterLocalListAction = null
}
