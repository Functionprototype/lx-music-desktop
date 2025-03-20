/**
 * @file 客户端列表同步处理模块
 * 该模块负责处理服务端发来的同步请求，并管理本地列表数据的同步状态
 */

// 这个文件导出的方法将暴露给服务端调用，第一个参数固定为当前 socket 对象
import {
  handleRemoteListAction,
  getLocalListData,
  setLocalListData,
} from '@main/modules/sync/listEvent'
import { toMD5 } from '@common/utils/nodejs'
import { removeSelectModeListener, sendCloseSelectMode, sendSelectMode } from '@main/modules/winMain'
import log from '@main/modules/sync/log'
import { registerEvent, unregisterEvent } from './localEvent'

/**
 * 记录同步事件的日志信息
 * @param eventName 事件名称
 * @param success 是否成功
 */
const logInfo = (eventName: string, success = false) => {
  log.info(`[${eventName}]${eventName.replace('list:sync:list_sync_', '').replaceAll('_', ' ')}${success ? ' success' : ''}`)
}

/**
 * 获取用户选择的同步模式
 * @param socket 当前的Socket连接实例
 * @returns 返回用户选择的同步模式
 */
const getSyncMode = async(socket: LX.Sync.Client.Socket): Promise<LX.Sync.List.SyncMode> => new Promise((resolve, reject) => {
  // 处理连接断开的情况
  const handleDisconnect = (err: Error) => {
    sendCloseSelectMode()
    removeSelectModeListener()
    reject(err)
  }
  let removeEventClose = socket.onClose(handleDisconnect)
  // 发送选择模式的请求给渲染进程
  sendSelectMode(socket.data.keyInfo.serverName, 'list', (mode) => {
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
 * 客户端列表同步处理器
 * 包含了处理服务端各种同步请求的方法
 */
const handler: LX.Sync.ClientSyncHandlerListActions<LX.Sync.Client.Socket> = {
  /**
   * 处理从服务端发来的列表同步操作
   * @param socket Socket连接实例
   * @param action 同步操作的具体内容
   */
  async onListSyncAction(socket, action) {
    if (!socket.moduleReadys?.list) return
    await handleRemoteListAction(action)
  },

  /**
   * 获取本地列表数据的MD5值
   * @param socket Socket连接实例
   * @returns 返回列表数据的MD5哈希值
   */
  async list_sync_get_md5(socket) {
    logInfo('list:sync:list_sync_get_md5')
    return toMD5(JSON.stringify(await getLocalListData()))
  },

  /**
   * 获取用户选择的同步模式
   * @param socket Socket连接实例
   * @returns 返回用户选择的同步模式
   */
  async list_sync_get_sync_mode(socket) {
    return getSyncMode(socket)
  },

  /**
   * 获取本地的列表数据
   * @param socket Socket连接实例
   * @returns 返回本地的完整列表数据
   */
  async list_sync_get_list_data(socket) {
    logInfo('list:sync:list_sync_get_list_data')
    return getLocalListData()
  },

  /**
   * 设置本地的列表数据
   * @param socket Socket连接实例
   * @param data 要设置的列表数据
   */
  async list_sync_set_list_data(socket, data) {
    logInfo('list:sync:list_sync_set_list_data')
    await setLocalListData(data)
  },

  /**
   * 列表同步完成的处理函数
   * @param socket Socket连接实例
   */
  async list_sync_finished(socket) {
    logInfo('list:sync:finished')
    socket.moduleReadys.list = true
    registerEvent(socket)
    socket.onClose(() => {
      unregisterEvent()
    })
  },
}

export default handler
