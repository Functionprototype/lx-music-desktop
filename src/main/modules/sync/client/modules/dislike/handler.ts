/**
 * 不喜欢列表同步处理模块
 * 该模块负责处理服务端发来的不喜欢列表同步请求，包括数据同步、操作同步等功能
 * 所有导出的方法将暴露给服务端调用，第一个参数固定为当前socket对象
 */

import { handleRemoteDislikeAction, getLocalDislikeData, setLocalDislikeData } from '@main/modules/sync/dislikeEvent'
import { toMD5 } from '@common/utils/nodejs'
import { removeSelectModeListener, sendCloseSelectMode, sendSelectMode } from '@main/modules/winMain'
import log from '@main/modules/sync/log'
import { registerEvent, unregisterEvent } from './localEvent'

/**
 * 记录同步事件的日志信息
 * @param eventName - 事件名称
 * @param success - 是否成功，默认为false
 */
const logInfo = (eventName: string, success = false) => {
  log.info(`[${eventName}]${eventName.replace('dislike:sync:dislike_sync_', '').replaceAll('_', ' ')}${success ? ' success' : ''}`)
}

// const logError = (eventName: string, err: Error) => {
//   log.error(`[${eventName}]${eventName.replace('dislike:sync:dislike_sync_', '').replaceAll('_', ' ')} error: ${err.message}`)
// }

/**
 * 获取同步模式
 * @param socket - 当前socket连接对象
 * @returns 返回用户选择的同步模式
 */
const getSyncMode = async(socket: LX.Sync.Client.Socket): Promise<LX.Sync.Dislike.SyncMode> => new Promise((resolve, reject) => {
  const handleDisconnect = (err: Error) => {
    sendCloseSelectMode()
    removeSelectModeListener()
    reject(err)
  }
  let removeEventClose = socket.onClose(handleDisconnect)
  sendSelectMode(socket.data.keyInfo.serverName, 'dislike', (mode) => {
    if (mode == null) {
      reject(new Error('cancel'))
      return
    }
    resolve(mode)
    removeSelectModeListener()
    removeEventClose()
  })
})
/**
 * 不喜欢列表同步处理器
 * 包含了所有同步相关的处理方法
 */
const handler: LX.Sync.ClientSyncHandlerDislikeActions<LX.Sync.Client.Socket> = {
  /**
   * 处理远程不喜欢列表同步操作
   * @param socket - 当前socket连接对象
   * @param action - 同步操作的具体内容
   */
  async onDislikeSyncAction(socket, action) {
    if (!socket.moduleReadys?.dislike) return
    await handleRemoteDislikeAction(action)
  },

  /**
   * 获取本地不喜欢列表的MD5值
   * @param socket - 当前socket连接对象
   * @returns 返回不喜欢列表数据的MD5哈希值
   */
  async dislike_sync_get_md5(socket) {
    logInfo('dislike:sync:dislike_sync_get_md5')
    return toMD5((await getLocalDislikeData()).trim())
  },

  /**
   * 获取用户选择的同步模式
   * @param socket - 当前socket连接对象
   * @returns 返回用户选择的同步模式
   */
  async dislike_sync_get_sync_mode(socket) {
    return getSyncMode(socket)
  },

  /**
   * 获取本地不喜欢列表数据
   * @param socket - 当前socket连接对象
   * @returns 返回完整的不喜欢列表数据
   */
  async dislike_sync_get_list_data(socket) {
    logInfo('dislike:sync:dislike_sync_get_list_data')
    return getLocalDislikeData()
  },

  /**
   * 设置本地不喜欢列表数据
   * @param socket - 当前socket连接对象
   * @param data - 要设置的不喜欢列表数据
   */
  async dislike_sync_set_list_data(socket, data) {
    logInfo('dislike:sync:dislike_sync_set_list_data')
    await setLocalDislikeData(data)
  },

  /**
   * 同步完成的处理函数
   * @param socket - 当前socket连接对象
   */
  async dislike_sync_finished(socket) {
    logInfo('dislike:sync:finished')
    socket.moduleReadys.dislike = true
    registerEvent(socket)
    socket.onClose(() => {
      unregisterEvent()
    })
  },
}

export default handler

