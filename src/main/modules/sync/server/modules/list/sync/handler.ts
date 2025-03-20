// 这个文件导出的方法将暴露给客户端调用，第一个参数固定为当前 socket 对象
// import { throttle } from '@common/utils/common'
// import { sendSyncActionList } from '@main/modules/winMain'
// import { SYNC_CLOSE_CODE } from '@/constants'
// import { SYNC_CLOSE_CODE } from '@common/constants_sync'
// import { SYNC_CLOSE_CODE } from '@common/constants_sync'
// import { getUserSpace } from '@main/modules/sync/server/user'
// import { handleRemoteListAction } from '@main/modules/sync/listEvent'
// import { encryptMsg } from '@/utils/tools'

// let wss: LX.SocketServer | null
// let removeListener: (() => void) | null

// type listAction = 'list:action'

// const registerListActionEvent = () => {
//   const list_data_overwrite = async(listData: MakeOptional<LX.List.ListDataFull, 'tempList'>, isRemote: boolean = false) => {
//     if (isRemote) return
//     await sendListAction({ action: 'list_data_overwrite', data: listData })
//   }
//   const list_create = async(position: number, listInfos: LX.List.UserListInfo[], isRemote: boolean = false) => {
//     if (isRemote) return
//     await sendListAction({ action: 'list_create', data: { position, listInfos } })
//   }
//   const list_remove = async(ids: string[], isRemote: boolean = false) => {
//     if (isRemote) return
//     await sendListAction({ action: 'list_remove', data: ids })
//   }
//   const list_update = async(lists: LX.List.UserListInfo[], isRemote: boolean = false) => {
//     if (isRemote) return
//     await sendListAction({ action: 'list_update', data: lists })
//   }
//   const list_update_position = async(position: number, ids: string[], isRemote: boolean = false) => {
//     if (isRemote) return
//     await sendListAction({ action: 'list_update_position', data: { position, ids } })
//   }
//   const list_music_overwrite = async(listId: string, musicInfos: LX.Music.MusicInfo[], isRemote: boolean = false) => {
//     if (isRemote) return
//     await sendListAction({ action: 'list_music_overwrite', data: { listId, musicInfos } })
//   }
//   const list_music_add = async(id: string, musicInfos: LX.Music.MusicInfo[], addMusicLocationType: LX.AddMusicLocationType, isRemote: boolean = false) => {
//     if (isRemote) return
//     await sendListAction({ action: 'list_music_add', data: { id, musicInfos, addMusicLocationType } })
//   }
//   const list_music_move = async(fromId: string, toId: string, musicInfos: LX.Music.MusicInfo[], addMusicLocationType: LX.AddMusicLocationType, isRemote: boolean = false) => {
//     if (isRemote) return
//     await sendListAction({ action: 'list_music_move', data: { fromId, toId, musicInfos, addMusicLocationType } })
//   }
//   const list_music_remove = async(listId: string, ids: string[], isRemote: boolean = false) => {
//     if (isRemote) return
//     await sendListAction({ action: 'list_music_remove', data: { listId, ids } })
//   }
//   const list_music_update = async(musicInfos: LX.List.ListActionMusicUpdate, isRemote: boolean = false) => {
//     if (isRemote) return
//     await sendListAction({ action: 'list_music_update', data: musicInfos })
//   }
//   const list_music_clear = async(ids: string[], isRemote: boolean = false) => {
//     if (isRemote) return
//     await sendListAction({ action: 'list_music_clear', data: ids })
//   }
//   const list_music_update_position = async(listId: string, position: number, ids: string[], isRemote: boolean = false) => {
//     if (isRemote) return
//     await sendListAction({ action: 'list_music_update_position', data: { listId, position, ids } })
//   }
//   global.event_list.on('list_data_overwrite', list_data_overwrite)
//   global.event_list.on('list_create', list_create)
//   global.event_list.on('list_remove', list_remove)
//   global.event_list.on('list_update', list_update)
//   global.event_list.on('list_update_position', list_update_position)
//   global.event_list.on('list_music_overwrite', list_music_overwrite)
//   global.event_list.on('list_music_add', list_music_add)
//   global.event_list.on('list_music_move', list_music_move)
//   global.event_list.on('list_music_remove', list_music_remove)
//   global.event_list.on('list_music_update', list_music_update)
//   global.event_list.on('list_music_clear', list_music_clear)
//   global.event_list.on('list_music_update_position', list_music_update_position)
//   return () => {
//     global.event_list.off('list_data_overwrite', list_data_overwrite)
//     global.event_list.off('list_create', list_create)
//     global.event_list.off('list_remove', list_remove)
//     global.event_list.off('list_update', list_update)
//     global.event_list.off('list_update_position', list_update_position)
//     global.event_list.off('list_music_overwrite', list_music_overwrite)
//     global.event_list.off('list_music_add', list_music_add)
//     global.event_list.off('list_music_move', list_music_move)
//     global.event_list.off('list_music_remove', list_music_remove)
//     global.event_list.off('list_music_update', list_music_update)
//     global.event_list.off('list_music_clear', list_music_clear)
//     global.event_list.off('list_music_update_position', list_music_update_position)
//   }
// }

// const addMusic = (orderId, callback) => {
//   // ...
// }

// const broadcast = async(socket: LX.Socket, key: string, data: any, excludeIds: string[] = []) => {
//   if (!wss) return
//   const dataStr = JSON.stringify({ action: 'list:sync:action', data })
//   const userSpace = getUserSpace(socket.userInfo.name)
//   for (const client of wss.clients) {
//     if (excludeIds.includes(client.keyInfo.clientId) || !client.isReady || client.userInfo.name != socket.userInfo.name) continue
//     client.send(encryptMsg(client.keyInfo, dataStr), (err) => {
//       if (err) {
//         client.close(SYNC_CLOSE_CODE.failed)
//         return
//       }
//       userSpace.dataManage.updateDeviceSnapshotKey(client.keyInfo, key)
//     })
//   }
// }

// export const sendListAction = async(action: LX.Sync.List.ActionList) => {
//   console.log('sendListAction', action.action)
//   // io.sockets
//   await broadcast('list:sync:action', action)
// }

// export const registerListHandler = (_wss: LX.SocketServer, socket: LX.Socket) => {
//   if (!wss) {
//     wss = _wss
//     // removeListener = registerListActionEvent()
//   }

//   const userSpace = getUserSpace(socket.userInfo.name)
//   socket.onRemoteEvent('list:sync:action', (action) => {
//     if (!socket.isReady) return
//     // console.log(msg)
//     void handleListAction(socket.userInfo.name, action).then(key => {
//       if (!key) return
//       console.log(key)
//       userSpace.dataManage.updateDeviceSnapshotKey(socket.keyInfo, key)
//       void broadcast(socket, key, action, [socket.keyInfo.clientId])
//     })
//     // socket.broadcast.emit('list:action', { action: 'list_remove', data: { id: 'default', index: 0 } })
//   })

//   // socket.on('list:add', addMusic)
// }
// export const unregisterListHandler = () => {
//   wss = null

//   // if (removeListener) {
//   //   removeListener()
//   //   removeListener = null
//   // }
// }

/**
 * @file 列表同步处理模块
 * 负责处理客户端发送的列表同步动作，并将更改广播给其他已连接的客户端
 * 实现了服务器端对播放列表的增删改查等操作的同步处理
 * 包含列表数据的快照管理、设备同步状态追踪等功能
 */

import { SYNC_CLOSE_CODE } from '@common/constants_sync'
import { getUserSpace } from '@main/modules/sync/server/user'
import { handleRemoteListAction } from '@main/modules/sync/listEvent'

/**
 * 列表同步处理器
 * 实现服务端对列表同步动作的处理逻辑
 * 包括：
 * 1. 验证客户端同步模块状态
 * 2. 处理远程列表操作请求
 * 3. 创建和更新数据快照
 * 4. 广播同步消息到其他客户端
 */
const handler: LX.Sync.ServerSyncHandlerListActions<LX.Sync.Server.Socket> = {
  /**
   * 处理列表同步动作
   * 接收并处理客户端发送的列表同步请求，确保多设备间的列表数据同步
   * 处理流程：
   * 1. 检查客户端列表模块是否就绪
   * 2. 执行列表操作并更新服务器数据
   * 3. 创建新的数据快照并更新设备状态
   * 4. 将更改广播给其他在线的客户端
   * 
   * @param socket - 当前连接的Socket实例，包含客户端身份和状态信息
   * @param action - 列表同步动作数据，包含具体的操作类型和相关数据
   */
  async onListSyncAction(socket, action) {
    // 检查列表模块是否就绪
    if (!socket.moduleReadys.list) return

    // 处理远程列表动作
    await handleRemoteListAction(action)

    // 获取用户空间并创建快照
    const userSpace = getUserSpace(socket.userInfo.name)
    const key = await userSpace.listManage.createSnapshot()
    userSpace.listManage.updateDeviceSnapshotKey(socket.keyInfo.clientId, key)

    // 保存当前用户信息
    const currentUserName = socket.userInfo.name
    const currentId = socket.keyInfo.clientId

    // 广播同步动作到其他客户端
    socket.broadcast((client) => {
      // 跳过当前客户端、未就绪的客户端和其他用户的客户端
      if (client.keyInfo.clientId == currentId || !client.moduleReadys?.list || client.userInfo.name != currentUserName) return

      // 发送同步动作到客户端
      void client.remoteQueueList.onListSyncAction(action).then(async() => {
        return userSpace.listManage.updateDeviceSnapshotKey(client.keyInfo.clientId, key)
      }).catch(err => {
        // 同步失败时关闭连接
        client.close(SYNC_CLOSE_CODE.failed)
        console.log(err.message)
      })
    })
  },
}

export default handler
