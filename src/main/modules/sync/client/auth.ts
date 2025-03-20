// 导入所需的依赖模块
import { request, generateRsaKey } from './utils'
import { getSyncAuthKey, setSyncAuthKey } from './data'
import log from '../log'
import { aesDecrypt, aesEncrypt, getComputerName, rsaDecrypt } from '../utils'
import { toMD5 } from '@common/utils/nodejs'
import { SYNC_CODE } from '@common/constants_sync'

// 与服务器进行握手验证
const hello = async(urlInfo: LX.Sync.Client.UrlInfo) => request(`${urlInfo.httpProtocol}//${urlInfo.hostPath}/hello`)
  .then(({ text }) => text == SYNC_CODE.helloMsg)
  .catch((err: any) => {
    log.error('[auth] hello', err.message)
    console.log(err)
    return false
  })

// 获取服务器ID
const getServerId = async(urlInfo: LX.Sync.Client.UrlInfo) => request(`${urlInfo.httpProtocol}//${urlInfo.hostPath}/id`)
  .then(({ text }) => {
    if (!text.startsWith(SYNC_CODE.idPrefix)) return ''
    return text.replace(SYNC_CODE.idPrefix, '')
  })
  .catch((err: any) => {
    log.error('[auth] getServerId', err.message)
    console.log(err)
    throw err
  })

// 使用授权码进行认证
const codeAuth = async(urlInfo: LX.Sync.Client.UrlInfo, serverId: string, authCode: string) => {
  // 生成16位的密钥
  let key = toMD5(authCode).substring(0, 16)
  key = Buffer.from(key).toString('base64')
  
  // 生成RSA密钥对
  let { publicKey, privateKey } = await generateRsaKey()
  publicKey = publicKey.replace(/\n/g, '')
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
  
  // 加密认证消息
  const msg = aesEncrypt(`${SYNC_CODE.authMsg}\n${publicKey}\n${getComputerName()}\nlx_music_desktop`, key)
  
  // 发送认证请求
  return request(`${urlInfo.httpProtocol}//${urlInfo.hostPath}/ah`, { headers: { m: msg } }).then(async({ text, code }) => {
    // 处理认证响应
    switch (text) {
      case SYNC_CODE.msgBlockedIp:
        throw new Error(SYNC_CODE.msgBlockedIp)
      case SYNC_CODE.authFailed:
        throw new Error(SYNC_CODE.authFailed)
      default:
        if (code != 200) throw new Error(SYNC_CODE.authFailed)
    }
    
    // 解密服务器响应
    let msg
    try {
      msg = rsaDecrypt(Buffer.from(text, 'base64'), privateKey).toString()
    } catch (err: any) {
      log.error('[auth] codeAuth decryptMsg error', err.message)
      throw new Error(SYNC_CODE.authFailed)
    }
    
    // 处理认证信息
    if (!msg) return Promise.reject(new Error(SYNC_CODE.authFailed))
    const info = JSON.parse(msg) as LX.Sync.ClientKeyInfo
    void setSyncAuthKey(serverId, info)
    return info
  })
}

// 使用已存储的密钥进行认证
const keyAuth = async(urlInfo: LX.Sync.Client.UrlInfo, keyInfo: LX.Sync.ClientKeyInfo) => {
  // 加密认证消息
  const msg = aesEncrypt(SYNC_CODE.authMsg + getComputerName(), keyInfo.key)
  
  // 发送认证请求
  return request(`${urlInfo.httpProtocol}//${urlInfo.hostPath}/ah`, { headers: { i: keyInfo.clientId, m: msg } }).then(({ text, code }) => {
    if (code != 200) throw new Error(SYNC_CODE.authFailed)

    // 解密并验证服务器响应
    let msg
    try {
      msg = aesDecrypt(text, keyInfo.key)
    } catch (err: any) {
      log.error('[auth] keyAuth decryptMsg error', err.message)
      throw new Error(SYNC_CODE.authFailed)
    }
    if (msg != SYNC_CODE.helloMsg) return Promise.reject(new Error(SYNC_CODE.authFailed))
  })
}

// 统一的认证处理函数
const auth = async(urlInfo: LX.Sync.Client.UrlInfo, serverId: string, authCode?: string) => {
  if (authCode) return codeAuth(urlInfo, serverId, authCode)
  const keyInfo = await getSyncAuthKey(serverId)
  if (!keyInfo) throw new Error(SYNC_CODE.missingAuthCode)
  await keyAuth(urlInfo, keyInfo)
  return keyInfo
}

// 导出默认的认证函数
export default async(urlInfo: LX.Sync.Client.UrlInfo, authCode?: string) => {
  console.log('connect: ', urlInfo.href, authCode)
  // 进行握手验证
  if (!await hello(urlInfo)) throw new Error(SYNC_CODE.connectServiceFailed)
  // 获取服务器ID
  const serverId = await getServerId(urlInfo)
  if (!serverId) throw new Error(SYNC_CODE.getServiceIdFailed)
  // 执行认证流程
  return auth(urlInfo, serverId, authCode)
}
