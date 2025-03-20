// 导入所需的依赖模块
import WebSocket from 'ws'
import { encryptMsg, decryptMsg } from './utils'
import { callObj } from './sync'
// import { action as commonAction } from '@root/store/modules/common'
// import { getStore } from '@root/store'
// import registerSyncListHandler from './syncList'
import log from '../log'
import { dateFormat } from '@common/utils/common'
import { aesEncrypt } from '../utils'
import { sendClientStatus } from '@main/modules/winMain'
import { createMsg2call } from 'message2call'
import { SYNC_CLOSE_CODE, SYNC_CODE } from '@common/constants_sync'
import { getAddress } from '@common/utils/nodejs'

// 客户端同步状态对象，包含连接状态、消息和地址信息
let status: LX.Sync.ClientStatus = {
  status: false,
  message: '',
  address: [],
}

// 发送同步状态更新到主窗口
export const sendSyncStatus = (newStatus: Omit<LX.Sync.ClientStatus, 'address'>) => {
  status.status = newStatus.status
  status.message = newStatus.message
  if (status.status) {
    status.address = getAddress()
  }
  sendClientStatus(status)
}

// 发送同步消息到主窗口
export const sendSyncMessage = (message: string) => {
  status.message = message
  sendClientStatus(status)
}

// 心跳检测工具对象，用于管理WebSocket连接的健康状态
const heartbeatTools = {
  failedNum: 0, // 连接失败次数
  maxTryNum: 100000, // 最大重试次数
  stepMs: 3000, // 重试间隔递增步长
  connectTimeout: null as NodeJS.Timeout | null, // 连接超时定时器
  pingTimeout: null as NodeJS.Timeout | null, // 心跳超时定时器
  delayRetryTimeout: null as NodeJS.Timeout | null, // 延迟重试定时器
  
  // 处理连接打开事件
  handleOpen() {
    console.log('open')
    this.heartbeat()
  },
  
  // 心跳检测机制
  heartbeat() {
    if (this.pingTimeout) clearTimeout(this.pingTimeout)

    // 设置心跳超时定时器，如果超时则强制断开连接
    this.pingTimeout = setTimeout(() => {
      client?.terminate()
    }, 30000 + 1000)
  },
  
  // 重新连接机制
  reConnnect() {
    this.clearTimeout()
    if (!client) return

    // 检查重试次数是否超过最大限制
    if (++this.failedNum > this.maxTryNum) {
      this.failedNum = 0
      sendSyncStatus({
        status: false,
        message: 'Connect error',
      })
      throw new Error('connect error')
    }

    // 计算重试等待时间，随重试次数增加而增加，但不超过15秒
    const waitTime = Math.min(2000 + Math.floor(this.failedNum / 2) * this.stepMs, 15000)

    // 延迟重试连接
    this.delayRetryTimeout = setTimeout(() => {
      this.delayRetryTimeout = null
      if (!client) return
      console.log(dateFormat(new Date()), 'reconnnect...')
      sendSyncStatus({
        status: false,
        message: `Try reconnnect... (${this.failedNum})`,
      })
      connect(client.data.urlInfo, client.data.keyInfo)
    }, waitTime)
  },
  
  // 清理所有定时器
  clearTimeout() {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout)
      this.connectTimeout = null
    }
    if (this.delayRetryTimeout) {
      clearTimeout(this.delayRetryTimeout)
      this.delayRetryTimeout = null
    }
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout)
      this.pingTimeout = null
    }
  },
  
  // 连接处理
  connect(socket: LX.Sync.Client.Socket) {
    console.log('heartbeatTools connect')
    // 设置连接超时定时器
    this.connectTimeout = setTimeout(() => {
      this.connectTimeout = null
      if (client) {
        try {
          client.close(SYNC_CLOSE_CODE.failed)
        } catch {}
      }
      if (++this.failedNum > this.maxTryNum) {
        this.failedNum = 0
        sendSyncStatus({
          status: false,
          message: 'Connect error',
        })
        throw new Error('connect error')
      }
      sendSyncStatus({
        status: false,
        message: 'Connect timeout, try reconnect...',
      })
      this.reConnnect()
    }, 2 * 60 * 1000)

    // 注册WebSocket事件处理器
    socket.on('open', () => {
      if (this.connectTimeout) {
        clearTimeout(this.connectTimeout)
        this.connectTimeout = null
      }
      this.handleOpen()
    })
    socket.on('ping', () => {
      this.heartbeat()
    })
    socket.on('close', (code) => {
      console.log(code)
      switch (code) {
        case SYNC_CLOSE_CODE.normal:
        case SYNC_CLOSE_CODE.failed:
          return
      }
      this.reConnnect()
    })
  },
}

// WebSocket客户端实例
let client: LX.Sync.Client.Socket | null

// 建立WebSocket连接
export const connect = (urlInfo: LX.Sync.Client.UrlInfo, keyInfo: LX.Sync.ClientKeyInfo) => {
  // 创建WebSocket连接，包含客户端ID和加密的连接令牌
  client = new WebSocket(`${urlInfo.wsProtocol}//${urlInfo.hostPath}/socket?i=${encodeURIComponent(keyInfo.clientId)}&t=${encodeURIComponent(aesEncrypt(SYNC_CODE.msgConnect, keyInfo.key))}`, {
  }) as LX.Sync.Client.Socket
  client.data = {
    keyInfo,
    urlInfo,
  }
  heartbeatTools.connect(client)

  // 关闭事件处理器数组
  let closeEvents: Array<(err: Error) => (void | Promise<void>)> = []
  let disconnected = true

  // 创建消息处理器
  const message2read = createMsg2call<LX.Sync.ServerSyncActions>({
    funcsObj: {
      ...callObj,
      // 同步完成处理
      finished() {
        log.info('sync list success')
        client!.isReady = true
        sendSyncStatus({
          status: true,
          message: '',
        })
        heartbeatTools.failedNum = 0
      },
    },
    timeout: 120 * 1000,
    // 发送消息处理
    sendMessage(data) {
      if (disconnected) throw new Error('disconnected')
      void encryptMsg(keyInfo, JSON.stringify(data)).then((data) => {
        client?.send(data)
      }).catch((err) => {
        log.error('encrypt msg error: ', err)
        client?.close(SYNC_CLOSE_CODE.failed)
      })
    },
    onCallBeforeParams(rawArgs) {
      return [client, ...rawArgs]
    },
    // 错误处理
    onError(error, path, groupName) {
      const name = groupName ?? ''
      log.error(`sync call ${name} ${path.join('.')} error:`, error)
    },
  })

  // 设置客户端远程调用接口
  client.remote = message2read.remote
  client.remoteQueueList = message2read.createQueueRemote('list')
  client.remoteQueueDislike = message2read.createQueueRemote('dislike')

  // 注册消息事件处理器
  client.addEventListener('message', ({ data }) => {
    if (data == 'ping') return
    if (typeof data === 'string') {
      void decryptMsg(keyInfo, data).then((data) => {
        let syncData: LX.Sync.ServerSyncActions
        try {
          syncData = JSON.parse(data)
        } catch (err) {
          log.error('parse msg error: ', err)
          client?.close(SYNC_CLOSE_CODE.failed)
          return
        }
        message2read.message(syncData)
      }).catch((error) => {
        log.error('decrypt msg error: ', error)
        client?.close(SYNC_CLOSE_CODE.failed)
      })
    }
  })

  // 注册关闭事件处理器
  client.onClose = function(handler: typeof closeEvents[number]) {
    closeEvents.push(handler)
    return () => {
      closeEvents.splice(closeEvents.indexOf(handler), 1)
    }
  }

  // 注册连接打开事件处理器
  const initMessage = 'Wait syncing...'
  client.addEventListener('open', () => {
    log.info('connect')
    client!.isReady = false
    client!.moduleReadys = {
      list: false,
      dislike: false,
    }
    disconnected = false
    sendSyncStatus({
      status: false,
      message: initMessage,
    })
  })

  // 注册连接关闭事件处理器
  client.addEventListener('close', ({ code }) => {
    const err = new Error('closed')
    try {
      for (const handler of closeEvents) void handler(err)
    } catch (err: any) {
      log.error(err?.message)
    }
    closeEvents = []
    disconnected = true
    message2read.destroy()
    switch (code) {
      case SYNC_CLOSE_CODE.normal:
        sendSyncStatus({
          status: false,
          message: '',
        })
        break
      case SYNC_CLOSE_CODE.failed:
        if (!status.message || status.message == initMessage) {
          sendSyncStatus({
            status: false,
            message: 'failed',
          })
        }
        break
    }
  })

  // 注册错误事件处理器
  client.addEventListener('error', ({ message }) => {
    sendSyncStatus({
      status: false,
      message,
    })
  })
}

// 断开连接
export const disconnect = async() => {
  if (!client) return
  log.info('disconnecting...')
  client.close(SYNC_CLOSE_CODE.normal)
  client = null
  heartbeatTools.clearTimeout()
  heartbeatTools.failedNum = 0
}

// 获取当前同步状态
export const getStatus = (): LX.Sync.ClientStatus => status
