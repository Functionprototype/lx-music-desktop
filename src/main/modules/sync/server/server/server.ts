/**
 * 同步服务器主模块
 * 负责管理WebSocket服务器的启动、停止、连接处理、认证等核心功能
 *
 * 主要功能包括:
 * 1. WebSocket服务器的启动和停止
 * 2. 客户端连接的处理和认证
 * 3. 同步功能的初始化和管理
 * 4. 验证码生成和管理
 * 5. 设备管理和状态维护
 * 6. 消息加密和解密
 * 7. 心跳检测机制
 *
 * @module sync/server/server
 * @description
 * 本模块是同步服务器的核心实现，提供了完整的WebSocket服务器功能。
 * 它负责处理客户端连接、认证、消息收发、心跳检测等基础功能，
 * 同时也管理着设备列表、验证码等状态信息。
 */

// 导入Node.js内置模块
import http, { type IncomingMessage } from 'node:http'
import type { Socket } from 'node:net'

// 导入WebSocket服务器模块
import { WebSocketServer } from 'ws'

// 导入同步相关模块
import { registerLocalSyncEvent, callObj, sync, unregisterLocalSyncEvent } from './sync'
import { authCode, authConnect } from './auth'
import { SYNC_CLOSE_CODE, SYNC_CODE } from '@common/constants_sync'

// 导入用户空间管理模块
import { getUserSpace, releaseUserSpace, getServerId, initServerInfo } from '../user'

// 导入工具模块
import { createMsg2call } from 'message2call'
import log from '../../log'
import { sendServerStatus } from '@main/modules/winMain'
import { decryptMsg, encryptMsg, generateCode as handleGenerateCode } from '../utils/tools'
import migrateData from '../../migrate'
// import type { Socket } from 'node:net'
import { getAddress } from '@common/utils/nodejs'


/**
 * 服务器状态对象，用于跟踪和维护服务器的运行状态
 * @type {LX.Sync.ServerStatus}
 */
let status: LX.Sync.ServerStatus = {
  status: false,      // 服务器运行状态(true: 运行中, false: 已停止)
  message: '',        // 状态消息(错误信息或其他状态说明)
  address: [],        // 服务器地址列表(所有可用的IP地址)
  code: '',          // 连接验证码(用于客户端认证)
  devices: [],       // 已连接设备列表(当前连接的所有客户端信息)
}

/**
 * 标记服务器是否正在停止的状态
 * 用于防止在停止过程中重复调用停止操作
 * @type {boolean}
 */
let stopingServer = false

/**
 * 服务器主机地址
 * 用于构建WebSocket连接URL和处理HTTP请求
 * @type {string}
 */
let host = 'http://localhost'

/**
 * 验证码管理工具对象
 * 负责定期更新服务器连接验证码
 * 
 * 主要功能:
 * 1. 启动定时更新验证码(每3分钟更新一次)
 * 2. 停止验证码更新定时器
 * 3. 维护验证码的生命周期
 * 
 * @description
 * 验证码是确保客户端连接安全的重要机制。
 * 通过定期更新验证码，可以:
 * - 降低验证码被破解的风险
 * - 限制过期验证码的使用
 * - 提供更好的连接安全性
 */
const codeTools: {
  timeout: NodeJS.Timeout | null  // 定时器引用
  start: () => void               // 启动定时更新
  stop: () => void                // 停止定时更新
} = {
  timeout: null,
  start() {
    this.stop()
    // 每3分钟更新一次验证码
    this.timeout = setInterval(() => {
      void handleGenerateCode()
    }, 60 * 3 * 1000)
  },
  stop() {
    if (!this.timeout) return
    clearInterval(this.timeout)
    this.timeout = null
  },
}

/**
 * 检查并处理重复连接的客户端
 * 当同一设备ID尝试建立新连接时，会断开该设备ID的旧连接
 * 
 * 处理流程:
 * 1. 遍历所有已连接的客户端
 * 2. 找到具有相同设备ID的旧连接
 * 3. 将旧连接标记为未就绪状态
 * 4. 关闭旧连接，确保同一设备只保持一个活跃连接
 * 
 * @param newSocket 新建立的WebSocket连接
 */
const checkDuplicateClient = (newSocket: LX.Sync.Server.Socket) => {
  for (const client of [...wss!.clients]) {
    // 跳过新连接自身和不同设备ID的连接
    if (client === newSocket || client.keyInfo.clientId != newSocket.keyInfo.clientId) continue
    
    // 记录重复连接日志
    log.info('duplicate client', client.userInfo.name, client.keyInfo.deviceName)
    
    // 将旧连接标记为未就绪
    client.isReady = false
    for (const name of Object.keys(client.moduleReadys) as Array<keyof LX.Sync.Server.Socket['moduleReadys']>) {
      client.moduleReadys[name] = false
    }
    
    // 关闭旧连接
    client.close(SYNC_CLOSE_CODE.normal)
  }
}

/**
 * 处理新的WebSocket连接
 * 
 * 处理流程:
 * 1. 验证客户端ID和密钥信息
 * 2. 更新客户端最后连接时间
 * 3. 检查并处理重复连接
 * 4. 初始化同步功能
 * 5. 更新设备状态列表
 * 6. 设置连接关闭处理
 * 
 * @param socket WebSocket连接对象
 * @param request HTTP请求对象
 */
const handleConnection = async(socket: LX.Sync.Server.Socket, request: IncomingMessage) => {
  const queryData = new URL(request.url!, host).searchParams
  const clientId = queryData.get('i')

  //   // if (typeof socket.handshake.query.i != 'string') return socket.disconnect(true)
  const userSpace = getUserSpace()
  const keyInfo = userSpace.dataManage.getClientKeyInfo(clientId)
  if (!keyInfo) {
    socket.close(SYNC_CLOSE_CODE.failed)
    return
  }
  keyInfo.lastConnectDate = Date.now()
  userSpace.dataManage.saveClientKeyInfo(keyInfo)
  //   // socket.lx_keyInfo = keyInfo
  socket.keyInfo = keyInfo
  socket.userInfo = { name: 'default' }

  checkDuplicateClient(socket)

  try {
    await sync(socket)
  } catch (err) {
    // console.log(err)
    log.warn(err)
    return
  }
  status.devices.push(keyInfo)
  // handleConnection(io, socket)
  sendServerStatus(status)
  socket.onClose(() => {
    status.devices.splice(status.devices.findIndex(k => k.clientId == keyInfo.clientId), 1)
    sendServerStatus(status)
  })

  // console.log('connection', keyInfo.deviceName)
  log.info('connection', keyInfo.deviceName)
  // console.log(socket.handshake.query)

  socket.isReady = true
}

/**
 * 处理WebSocket连接断开
 * 清理用户空间和相关资源
 */
const handleUnconnection = () => {
  // console.log('unconnection')
  releaseUserSpace()
}

/**
 * 验证客户端连接请求
 * 检查认证码和其他安全参数
 * 
 * @param req HTTP请求对象
 * @param callback 认证结果回调函数
 */
const authConnection = (req: http.IncomingMessage, callback: (err: string | null | undefined, success: boolean) => void) => {
  // console.log(req.headers)
  // // console.log(req.auth)
  // console.log(req._query.authCode)
  authConnect(req).then(() => {
    callback(null, true)
  }).catch(err => {
    callback(err, false)
  })
}

let wss: LX.Sync.Server.SocketServer | null
let httpServer: http.Server
let sockets = new Set<Socket>()

/**
 * 空函数，用于WebSocket心跳检测
 */
function noop() {}

/**
 * WebSocket错误处理函数
 * @param err 错误对象
 */
function onSocketError(err: Error) {
  console.error(err)
}

/**
 * 启动WebSocket服务器
 * 
 * 功能:
 * 1. 创建HTTP服务器
 * 2. 处理基本的HTTP请求(hello、id、认证等)
 * 3. 初始化WebSocket服务器
 * 4. 设置心跳检测
 * 5. 处理连接认证和握手
 * 
 * @param port 服务器端口号，默认9527
 * @param ip 服务器IP地址，默认0.0.0.0
 * @returns Promise对象
 */
const handleStartServer = async(port = 9527, ip = '0.0.0.0') => await new Promise((resolve, reject) => {
  httpServer = http.createServer((req, res) => {
    // console.log(req.url)
    const endUrl = `/${req.url?.split('/').at(-1) ?? ''}`
    let code
    let msg
    switch (endUrl) {
      case '/hello':
        code = 200
        msg = SYNC_CODE.helloMsg
        break
      case '/id':
        code = 200
        msg = SYNC_CODE.idPrefix + getServerId()
        break
      case '/ah':
        void authCode(req, res, status.code)
        break
      default:
        code = 401
        msg = 'Forbidden'
        break
    }
    if (!code) return
    res.writeHead(code)
    res.end(msg)
  })

  wss = new WebSocketServer({
    noServer: true,
  })

  wss.on('connection', function(socket, request) {
    socket.isReady = false
    socket.moduleReadys = {
      list: false,
      dislike: false,
    }
    socket.feature = {
      list: false,
      dislike: false,
    }
    // 处理心跳响应
    socket.on('pong', () => {
      socket.isAlive = true
    })

    // 关闭事件处理器数组
    let closeEvents: Array<(err: Error) => (void | Promise<void>)> = []
    let disconnected = false

    // 创建消息处理器，用于处理客户端同步操作
    /**
 * 消息处理工具对象
 * 负责处理服务器与客户端之间的消息通信
 * 
 * 主要功能:
 * 1. 处理客户端同步操作
 * 2. 加密消息发送
 * 3. 错误处理和日志记录
 */
const msg2call = createMsg2call<LX.Sync.ClientSyncActions>({
      funcsObj: callObj,
      timeout: 120 * 1000,
      sendMessage(data) {
        if (disconnected) throw new Error('disconnected')
        void encryptMsg(socket.keyInfo, JSON.stringify(data)).then((data) => {
          socket.send(data)
        }).catch(err => {
          log.error('encrypt message error:', err)
          log.error(err.message)
          socket.close(SYNC_CLOSE_CODE.failed)
        })
      },
      onCallBeforeParams(rawArgs) {
        return [socket, ...rawArgs]
      },
      onError(error, path, groupName) {
        const name = groupName ?? ''
        const deviceName = socket.keyInfo?.deviceName ?? ''
        log.error(`sync call ${deviceName} ${name} ${path.join('.')} error:`, error)
      },
    })
    socket.remote = msg2call.remote
    socket.remoteQueueList = msg2call.createQueueRemote('list')
    socket.remoteQueueDislike = msg2call.createQueueRemote('dislike')
    socket.addEventListener('message', ({ data }) => {
      if (typeof data != 'string') return
      void decryptMsg(socket.keyInfo, data).then((data) => {
        let syncData: any
        try {
          syncData = JSON.parse(data)
        } catch (err) {
          log.error('parse message error:', err)
          socket.close(SYNC_CLOSE_CODE.failed)
          return
        }
        msg2call.message(syncData)
      }).catch(err => {
        log.error('decrypt message error:', err)
        log.error(err.message)
        socket.close(SYNC_CLOSE_CODE.failed)
      })
    })
    socket.addEventListener('close', () => {
      const err = new Error('closed')
      try {
        for (const handler of closeEvents) void handler(err)
      } catch (err: any) {
        log.error(err?.message)
      }
      closeEvents = []
      disconnected = true
      msg2call.destroy()
      if (socket.isReady) {
        log.info('deconnection', socket.userInfo.name, socket.keyInfo.deviceName)
        // events = {}
        if (!status.devices.length) handleUnconnection()
      } else {
        const queryData = new URL(request.url!, host).searchParams
        log.info('deconnection', queryData.get('i'))
      }
    })
    socket.onClose = function(handler: typeof closeEvents[number]) {
      closeEvents.push(handler)
      return () => {
        closeEvents.splice(closeEvents.indexOf(handler), 1)
      }
    }
    socket.broadcast = function(handler) {
      if (!wss) return
      for (const client of wss.clients) handler(client)
    }

    void handleConnection(socket, request)
  })

  httpServer.on('upgrade', function upgrade(request, socket, head) {
    socket.addListener('error', onSocketError)
    // This function is not defined on purpose. Implement it with your own logic.
    authConnection(request, err => {
      if (err) {
        console.log(err)
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
        socket.destroy()
        return
      }
      socket.removeListener('error', onSocketError)

      wss?.handleUpgrade(request, socket, head, function done(ws) {
        wss?.emit('connection', ws, request)
      })
    })
  })

  const interval = setInterval(() => {
    wss?.clients.forEach(socket => {
      if (socket.isAlive == false) {
        log.info('alive check false:', socket.userInfo.name, socket.keyInfo.deviceName)
        socket.terminate()
        return
      }

      socket.isAlive = false
      socket.ping(noop)
      if (socket.keyInfo.isMobile) socket.send('ping', noop)
    })
  }, 30000)

  wss.on('close', function close() {
    clearInterval(interval)
  })

  httpServer.on('error', error => {
    console.log(error)
    reject(error)
  })
  httpServer.on('connection', (socket) => {
    sockets.add(socket)
    socket.once('close', () => {
      sockets.delete(socket)
    })
  })

  httpServer.on('listening', () => {
    const addr = httpServer.address()
    // console.log(addr)
    if (!addr) {
      reject(new Error('address is null'))
      return
    }
    const bind = typeof addr == 'string' ? `pipe ${addr}` : `port ${addr.port}`
    log.info(`Listening on ${ip} ${bind}`)
    resolve(null)
    void registerLocalSyncEvent(wss!)
  })

  host = `http://${ip}:${port}`
  httpServer.listen(port, ip)
})

/**
 * 停止WebSocket服务器
 * 
 * 功能:
 * 1. 标记服务器停止状态
 * 2. 关闭所有客户端连接
 * 3. 清理服务器资源
 * 4. 停止验证码更新
 * 5. 更新服务器状态
 */
const handleStopServer = async() => new Promise<void>((resolve, reject) => {
  if (!wss) return
  for (const client of wss.clients) client.close(SYNC_CLOSE_CODE.normal)
  unregisterLocalSyncEvent()
  wss.close()
  wss = null
  httpServer.close((err) => {
    if (err) {
      reject(err)
      return
    }
    resolve()
  })
  for (const socket of sockets) socket.destroy()
  sockets.clear()
})

/**
 * 停止WebSocket服务器
 * 
 * 停止流程:
 * 1. 停止验证码更新定时器
 * 2. 检查服务器状态
 * 3. 更新服务器状态为停止中
 * 4. 执行停止服务器操作
 * 5. 清理服务器状态
 */
export const stopServer = async() => {
  codeTools.stop()
  if (!status.status) {
    status.status = false
    status.message = ''
    status.address = []
    status.code = ''
    sendServerStatus(status)
    return
  }
  console.log('stoping sync server...')
  status.message = 'stoping...'
  sendServerStatus(status)
  stopingServer = true
  await handleStopServer().then(() => {
    console.log('sync server stoped')
    status.status = false
    status.message = ''
    status.address = []
    status.code = ''
  }).catch(err => {
    console.log(err)
    status.message = err.message
  }).finally(() => {
    sendServerStatus(status)
    stopingServer = false
  })
}

/**
 * 启动WebSocket服务器
 * 
 * 启动流程:
 * 1. 检查服务器状态，避免重复启动
 * 2. 初始化数据和服务器信息
 * 3. 启动WebSocket服务器
 * 4. 更新服务器状态
 * 5. 生成验证码并启动定时更新
 * 
 * @param port 服务器端口号
 */
export const startServer = async(port: number) => {
  console.log('status.status', status.status, stopingServer)
  if (stopingServer) return
  if (status.status) await handleStopServer()

  await migrateData(global.lxDataPath)
  await initServerInfo()

  log.info('starting sync server')
  await handleStartServer(port).then(() => {
    console.log('sync server started')
    status.status = true
    status.message = ''
    status.address = getAddress()

    void generateCode()
    codeTools.start()
  }).catch(err => {
    console.log(err)
    status.status = false
    status.message = err.message
    status.address = []
    status.code = ''
  }).finally(() => {
    sendServerStatus(status)
  })
}

export const getStatus = (): LX.Sync.ServerStatus => status

export const generateCode = async() => {
  status.code = handleGenerateCode()
  sendServerStatus(status)
  return status.code
}

export const getDevices = async() => {
  const userSpace = getUserSpace()
  return userSpace.getDecices()
}

export const removeDevice = async(clientId: string) => {
  if (wss) {
    for (const client of wss.clients) {
      if (client.keyInfo.clientId == clientId) client.close(SYNC_CLOSE_CODE.normal)
    }
  }
  const userSpace = getUserSpace()
  await userSpace.removeDevice(clientId)
}
