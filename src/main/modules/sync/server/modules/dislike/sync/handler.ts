import { SYNC_CLOSE_CODE } from '@common/constants_sync'
import { getUserSpace } from '@main/modules/sync/server/user'
import { handleRemoteDislikeAction } from '@main/modules/sync/dislikeEvent'

/**
 * 不喜欢列表同步处理器
 * 负责处理来自客户端的不喜欢列表同步请求
 * 包括同步动作的处理、快照管理和广播更新等功能
 */
const handler: LX.Sync.ServerSyncHandlerDislikeActions<LX.Sync.Server.Socket> = {
  async onDislikeSyncAction(socket, action) {
    if (!socket.moduleReadys.dislike) return
    await handleRemoteDislikeAction(action)
    const userSpace = getUserSpace(socket.userInfo.name)
    const key = await userSpace.dislikeManage.createSnapshot()
    userSpace.dislikeManage.updateDeviceSnapshotKey(socket.keyInfo.clientId, key)
    const currentUserName = socket.userInfo.name
    const currentId = socket.keyInfo.clientId
    socket.broadcast((client) => {
      if (client.keyInfo.clientId == currentId || !client.moduleReadys?.dislike || client.userInfo.name != currentUserName) return
      void client.remoteQueueDislike.onDislikeSyncAction(action).then(async() => {
        return userSpace.dislikeManage.updateDeviceSnapshotKey(client.keyInfo.clientId, key)
      }).catch(err => {
      // TODO send status
        client.close(SYNC_CLOSE_CODE.failed)
        // client.moduleReadys.dislike = false
        console.log(err.message)
      })
    })
  },
}

export default handler
