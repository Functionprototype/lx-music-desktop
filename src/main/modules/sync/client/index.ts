/**
 * 同步客户端模块
 * 负责管理与同步服务器的连接、认证和状态同步
 */

import handleAuth from './auth'
import { connect as socketConnect, disconnect as socketDisconnect, sendSyncStatus, sendSyncMessage } from './client'
// import { getSyncHost } from '@root/utils/data'
import log from '../log'
import { parseUrl } from './utils'
import migrateData from '../migrate'
import { SYNC_CODE } from '@common/constants_sync'

// 连接ID，用于防止多个连接请求的竞态条件
let connectId = 0

/**
 * 处理连接服务器的核心逻辑
 * @param host 服务器地址
 * @param authCode 可选的认证码
 */
const handleConnect = async(host: string, authCode?: string) => {
  // const hostInfo = await getSyncHost()
  // console.log(hostInfo)
  // if (!hostInfo || !hostInfo.host || !hostInfo.port) throw new Error(SYNC_CODE.unknownServiceAddress)
  const id = connectId
  const urlInfo = parseUrl(host)
  await disconnectServer(false)
  if (id != connectId) return
  const keyInfo = await handleAuth(urlInfo, authCode)
  if (id != connectId) return
  socketConnect(urlInfo, keyInfo)
}
/**
 * 处理断开服务器连接
 */
const handleDisconnect = async() => {
  await socketDisconnect()
}

/**
 * 连接到同步服务器
 * @param host 服务器地址
 * @param authCode 可选的认证码
 * @returns Promise 连接结果
 */
const connectServer = async(host: string, authCode?: string) => {
  sendSyncStatus({
    status: false,
    message: SYNC_CODE.connecting,
  })
  const id = connectId
  await migrateData(global.lxDataPath)

  return handleConnect(host, authCode).catch(async err => {
    if (id != connectId) return
    sendSyncStatus({
      status: false,
      message: err.message,
    })
    switch (err.message) {
      case SYNC_CODE.connectServiceFailed:
      case SYNC_CODE.missingAuthCode:
        break
      default:
        log.r_warn(err.message)
        break
    }

    return Promise.reject(err)
  })
}

/**
 * 断开与同步服务器的连接
 * @param isResetStatus 是否重置连接状态，默认为true
 * @returns Promise
 */
const disconnectServer = async(isResetStatus = true) => handleDisconnect().then(() => {
  log.info('disconnect...')
  if (isResetStatus) {
    connectId++
    sendSyncStatus({
      status: false,
      message: '',
    })
  }
}).catch((err: any) => {
  log.error(`disconnect error: ${err.message as string}`)
  sendSyncMessage(err.message)
})

export {
  connectServer,
  disconnectServer,
}

export {
  getStatus,
} from './client'
