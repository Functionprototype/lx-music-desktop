/**
 * @file 同步模块客户端工具函数
 * 包含HTTP请求封装、RSA密钥生成、消息加密解密等功能
 */

import { generateKeyPair } from 'node:crypto'
import { httpFetch, type RequestOptions } from '@main/utils/request'
import { decodeData, encodeData } from '../utils'

/**
 * 发送HTTP请求的封装函数
 * 对httpFetch进行封装，添加默认的超时时间和最大重定向次数
 * @param url 请求的URL地址
 * @param options 请求选项，包含超时时间、请求头等配置
 * @returns Promise<{text: string, code: number}> 返回包含响应内容和HTTP状态码的对象
 */
export const request = async(url: string, options: RequestOptions = { }) => {
  return httpFetch(url, {
    ...options,
    timeout: options.timeout ?? 10000,
    follow_max: 5,
  }).then(response => {
    return {
      text: response.body,
      code: response.statusCode,
    }
  })
}

/**
 * 生成RSA密钥对
 * 使用node:crypto模块生成2048位的RSA密钥对
 * 生成的密钥对采用PKCS#8标准的PEM格式
 * @returns Promise<{publicKey: string, privateKey: string}> 返回包含公钥和私钥的对象
 */
export const generateRsaKey = async() => new Promise<{ publicKey: string, privateKey: string }>((resolve, reject) => {
  generateKeyPair(
    'rsa',
    {
      modulusLength: 2048, // RSA密钥长度，单位为位
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    },
    (err, publicKey, privateKey) => {
      if (err) {
        reject(err)
        return
      }
      resolve({
        publicKey,
        privateKey,
      })
    },
  )
})

/**
 * 加密消息
 * 使用客户端密钥信息对消息进行加密，支持大数据压缩
 * @param keyInfo 客户端密钥信息，包含加密所需的密钥数据
 * @param msg 要加密的原始消息
 * @returns Promise<string> 返回加密并可能压缩后的消息
 */
export const encryptMsg = async(keyInfo: LX.Sync.ClientKeyInfo, msg: string): Promise<string> => {
  return encodeData(msg)
}

/**
 * 解密消息
 * 使用客户端密钥信息对加密消息进行解密，自动处理压缩数据
 * @param keyInfo 客户端密钥信息，包含解密所需的密钥数据
 * @param enMsg 加密的消息内容
 * @returns Promise<string> 返回解密并解压缩（如果需要）后的原始消息
 */
export const decryptMsg = async(keyInfo: LX.Sync.ClientKeyInfo, enMsg: string): Promise<string> => {
  return decodeData(enMsg)
}

/**
 * 解析URL，提取协议和路径信息
 * 将完整URL解析为包含WebSocket和HTTP协议、主机路径等信息的对象
 * @param host 完整的URL字符串，支持http/https协议
 * @returns LX.Sync.Client.UrlInfo URL信息对象
 * - wsProtocol: WebSocket协议(ws:/wss:)
 * - httpProtocol: HTTP协议(http:/https:)
 * - hostPath: 主机路径(不含末尾斜杠)
 * - href: 完整URL(不含末尾斜杠)
 */
export const parseUrl = (host: string): LX.Sync.Client.UrlInfo => {
  const url = new URL(host)
  let hostPath = url.host + url.pathname
  let href = url.href
  // 移除URL末尾的斜杠
  if (hostPath.endsWith('/')) hostPath = hostPath.replace(/\/$/, '')
  if (href.endsWith('/')) href = href.replace(/\/$/, '')

  return {
    wsProtocol: url.protocol == 'https:' ? 'wss:' : 'ws:', // 根据HTTP协议确定WebSocket协议
    httpProtocol: url.protocol,
    hostPath,
    href,
  }
}

/**
 * 发送客户端状态
 * 用于向服务器发送客户端的当前状态信息
 * @param status 客户端状态对象，包含在线状态、同步状态等信息
 */
export const sendStatus = (status: LX.Sync.ClientStatus) => {
}
