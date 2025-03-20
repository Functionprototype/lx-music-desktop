/**
 * @file 列表同步本地事件处理模块
 * 负责处理本地列表变更事件，并将变更广播给已连接的客户端
 */

import { SYNC_CLOSE_CODE } from '@common/constants_sync'
import { registerListActionEvent } from '../../../../listEvent'
import { getUserSpace } from '../../../user'

// 本地列表动作事件注销函数
let unregisterLocalListAction: (() => void) | null

/**
 * 发送列表动作到所有已连接的客户端
 * @param wss - WebSocket服务器实例
 * @param action - 列表动作数据
 */
const sendListAction = async(wss: LX.Sync.Server.SocketServer, action: LX.Sync.List.ActionList) => {
  const userSpace = getUserSpace()
  let key = ''
  for (const client of wss.clients) {
    // 跳过未就绪的客户端
    if (!client.moduleReadys?.list) continue
    
    // 创建快照并更新设备快照键值
    if (!key) key = await userSpace.listManage.createSnapshot()
    void client.remoteQueueList.onListSyncAction(action).then(async() => {
      return userSpace.listManage.updateDeviceSnapshotKey(client.keyInfo.clientId, key)
    }).catch(err => {
      // 同步失败时关闭连接
      client.close(SYNC_CLOSE_CODE.failed)
      console.log(err.message)
    })
  }
}

/**
 * 注册本地事件处理
 * @param wss - WebSocket服务器实例
 */
export const registerEvent = (wss: LX.Sync.Server.SocketServer) => {
  unregisterEvent()
  unregisterLocalListAction = registerListActionEvent((action) => {
    void sendListAction(wss, action)
  })
}

/**
 * 注销本地事件处理
 */
export const unregisterEvent = () => {
  unregisterLocalListAction?.()
  unregisterLocalListAction = null
}
