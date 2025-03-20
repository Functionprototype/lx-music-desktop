// 同步服务器认证模块，实现客户端连接认证、密钥验证和IP限制等功能
import type http from 'http'
import {
  aesEncrypt,
  aesDecrypt,
  rsaEncrypt,
  getIP,
} from '../utils/tools'
import querystring from 'node:querystring'
import { getUserSpace, createClientKeyInfo } from '../user'
import { toMD5 } from '../utils'
import { getComputerName } from '../../utils'
import { SYNC_CODE } from '@common/constants_sync'

// 用于记录IP请求次数的Map
const requestIps = new Map<string, number>()

// 检查IP是否可用，限制单个IP的请求次数
const getAvailableIP = (req: http.IncomingMessage) => {
  let ip = getIP(req)
  return ip && (requestIps.get(ip) ?? 0) < 10 ? ip : null
}

// 使用已存储的密钥验证客户端
// @param encryptMsg - 加密的消息
// @param userId - 客户端ID
// @returns 验证成功返回加密的hello消息，失败返回null
const verifyByKey = (encryptMsg: string, userId: string) => {
  const userSpace = getUserSpace()
  const keyInfo = userSpace.dataManage.getClientKeyInfo(userId)
  if (!keyInfo) return null
  let text
  try {
    // 使用存储的密钥解密消息
    text = aesDecrypt(encryptMsg, keyInfo.key)
  } catch (err) {
    return null
  }
  // 验证消息格式并更新设备名称
  if (text.startsWith(SYNC_CODE.authMsg)) {
    const deviceName = text.replace(SYNC_CODE.authMsg, '') || 'Unknown'
    if (deviceName != keyInfo.deviceName) {
      keyInfo.deviceName = deviceName
      userSpace.dataManage.saveClientKeyInfo(keyInfo)
    }
    return aesEncrypt(SYNC_CODE.helloMsg, keyInfo.key)
  }
  return null
}

// 使用验证码进行首次客户端认证
// @param encryptMsg - 加密的消息
// @param password - 验证码
// @returns 验证成功返回加密的客户端信息，失败返回null
const verifyByCode = (encryptMsg: string, password: string) => {
  // 生成16位密钥
  let key = toMD5(password).substring(0, 16)
  key = Buffer.from(key).toString('base64')
  let text
  try {
    // 使用验证码生成的密钥解密消息
    text = aesDecrypt(encryptMsg, key)
  } catch {
    return null
  }
  // 验证消息格式并创建客户端密钥信息
  if (text.startsWith(SYNC_CODE.authMsg)) {
    const data = text.split('\n')
    const publicKey = `-----BEGIN PUBLIC KEY-----\n${data[1]}\n-----END PUBLIC KEY-----`
    const deviceName = data[2] || 'Unknown'
    const isMobile = data[3] == 'lx_music_mobile'
    const keyInfo = createClientKeyInfo(deviceName, isMobile)
    const userSpace = getUserSpace()
    userSpace.dataManage.saveClientKeyInfo(keyInfo)
    // 使用客户端公钥加密返回信息
    return rsaEncrypt(Buffer.from(JSON.stringify({
      clientId: keyInfo.clientId,
      key: keyInfo.key,
      serverName: getComputerName(),
    })), publicKey)
  }
  return null
}

// 处理客户端认证请求
// @param req - HTTP请求对象
// @param res - HTTP响应对象
// @param password - 验证码
export const authCode = async(req: http.IncomingMessage, res: http.ServerResponse, password: string) => {
  let code = 401
  let msg: string = SYNC_CODE.msgAuthFailed

  let ip = getAvailableIP(req)
  if (ip) {
    // 验证客户端消息
    if (typeof req.headers.m == 'string' && req.headers.m) {
      const userId = req.headers.i
      const _msg = typeof userId == 'string' && userId
        ? verifyByKey(req.headers.m, userId)  // 使用已存储的密钥验证
        : verifyByCode(req.headers.m, password)  // 使用验证码验证
      if (_msg != null) {
        msg = _msg
        code = 200
      }
    }

    // 记录失败的请求次数
    if (code != 200) {
      const num = requestIps.get(ip) ?? 0
      requestIps.set(ip, num + 1)
    }
  } else {
    code = 403
    msg = SYNC_CODE.msgBlockedIp
  }

  res.writeHead(code)
  res.end(msg)
}

// 验证客户端连接请求
// @param encryptMsg - 加密的连接消息
// @param userId - 客户端ID
// @returns 验证成功返回true，失败返回false
const verifyConnection = (encryptMsg: string, userId: string) => {
  const userSpace = getUserSpace()
  const keyInfo = userSpace.dataManage.getClientKeyInfo(userId)
  if (!keyInfo) return false
  let text
  try {
    text = aesDecrypt(encryptMsg, keyInfo.key)
  } catch (err) {
    return false
  }
  return text == SYNC_CODE.msgConnect
}

// 处理客户端连接认证
// @param req - HTTP请求对象
// @throws 认证失败时抛出错误
export const authConnect = async(req: http.IncomingMessage) => {
  let ip = getAvailableIP(req)
  if (ip) {
    const query = querystring.parse((req.url!).split('?')[1])
    const i = query.i
    const t = query.t
    if (typeof i == 'string' && typeof t == 'string' && verifyConnection(t, i)) return

    // 记录失败的请求次数
    const num = requestIps.get(ip) ?? 0
    requestIps.set(ip, num + 1)
  }
  throw new Error('failed')
}

