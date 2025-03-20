/**
 * @file 服务器端工具函数集合
 * 包含验证码生成、IP地址获取、加密解密、数据压缩等功能
 */

import { createCipheriv, createDecipheriv, publicEncrypt, privateDecrypt, constants } from 'node:crypto'
// import { join } from 'node:path'
import zlib from 'node:zlib'
import type http from 'node:http'
// import getStore from '@/utils/store'
// import syncLog from '../../log'
// import { getUserName } from '../user/data'
// import { saveClientKeyInfo } from './data'

/**
 * 生成6位随机数字验证码
 * 用于客户端连接验证，通过截取Math.random()生成的随机数字
 * @returns 返回6位数字字符串作为验证码
 */
export const generateCode = (): string => {
  return Math.random().toString().substring(2, 8)
}

/**
 * 获取HTTP请求的客户端IP地址
 * 从HTTP请求对象中提取客户端的远程IP地址
 * @param request HTTP请求对象，包含客户端连接信息
 * @returns 返回客户端的IP地址字符串
 */
export const getIP = (request: http.IncomingMessage) => {
  return request.socket.remoteAddress
}


/**
 * 使用AES-128-ECB算法加密数据
 * 支持字符串或Buffer类型的输入数据
 * @param buffer 要加密的数据，可以是字符串或Buffer
 * @param key Base64编码的AES密钥（128位）
 * @returns 返回Base64编码的加密结果
 */
export const aesEncrypt = (buffer: string | Buffer, key: string): string => {
  const cipher = createCipheriv('aes-128-ecb', Buffer.from(key, 'base64'), '')
  return Buffer.concat([cipher.update(buffer), cipher.final()]).toString('base64')
}

/**
 * 使用AES-128-ECB算法解密数据
 * 将Base64编码的加密数据解密为原始字符串
 * @param text Base64编码的加密数据
 * @param key Base64编码的AES密钥（128位）
 * @returns 返回解密后的原始字符串
 */
export const aesDecrypt = (text: string, key: string): string => {
  const decipher = createDecipheriv('aes-128-ecb', Buffer.from(key, 'base64'), '')
  return Buffer.concat([decipher.update(Buffer.from(text, 'base64')), decipher.final()]).toString()
}

/**
 * 使用RSA公钥加密数据
 * 采用PKCS1_OAEP填充方案进行RSA加密
 * @param buffer 要加密的数据Buffer
 * @param key PEM格式的RSA公钥
 * @returns 返回Base64编码的加密结果
 */
export const rsaEncrypt = (buffer: Buffer, key: string): string => {
  return publicEncrypt({ key, padding: constants.RSA_PKCS1_OAEP_PADDING }, buffer).toString('base64')
}

/**
 * 使用RSA私钥解密数据
 * 采用PKCS1_OAEP填充方案进行RSA解密
 * @param buffer 要解密的数据Buffer
 * @param key PEM格式的RSA私钥
 * @returns 返回解密后的原始数据Buffer
 */
export const rsaDecrypt = (buffer: Buffer, key: string): Buffer => {
  return privateDecrypt({ key, padding: constants.RSA_PKCS1_OAEP_PADDING }, buffer)
}


/**
 * 使用gzip压缩字符串数据
 * 将字符串数据压缩后转换为Base64编码
 * @param data 要压缩的原始字符串
 * @returns Promise<string> 返回Base64编码的压缩数据
 */
const gzip = async(data: string) => new Promise<string>((resolve, reject) => {
  zlib.gzip(data, (err, buf) => {
    if (err) {
      reject(err)
      return
    }
    resolve(buf.toString('base64'))
  })
})
/**
 * 解压缩gzip压缩的数据
 * 将Base64编码的压缩数据解压还原为原始字符串
 * @param data Base64编码的压缩数据
 * @returns Promise<string> 返回解压缩后的原始字符串
 */
const unGzip = async(data: string) => new Promise<string>((resolve, reject) => {
  zlib.gunzip(Buffer.from(data, 'base64'), (err, buf) => {
    if (err) {
      reject(err)
      return
    }
    resolve(buf.toString())
  })
})

/**
 * 加密消息
 * 根据消息长度自动选择是否进行压缩处理
 * 当消息长度超过1024字节时，使用gzip压缩并添加'cg_'前缀
 * @param keyInfo 服务器密钥信息，包含加密所需的密钥数据
 * @param msg 要加密的原始消息
 * @returns Promise<string> 返回加密/压缩后的消息
 */
export const encryptMsg = async(keyInfo: LX.Sync.ServerKeyInfo | null, msg: string): Promise<string> => {
  return msg.length > 1024
    ? 'cg_' + await gzip(msg)
    : msg
  // if (!keyInfo) return ''
  // return aesEncrypt(msg, keyInfo.key, keyInfo.iv)
}

/**
 * 解密消息
 * 自动检测消息是否经过压缩（以'cg_'为标识）
 * 如果是压缩数据则先解压，否则直接返回原始消息
 * @param keyInfo 服务器密钥信息，包含解密所需的密钥数据
 * @param enMsg 加密/压缩的消息内容
 * @returns Promise<string> 返回解密/解压后的原始消息
 */
export const decryptMsg = async(keyInfo: LX.Sync.ServerKeyInfo | null, enMsg: string): Promise<string> => {
  return enMsg.substring(0, 3) == 'cg_'
    ? await unGzip(enMsg.replace('cg_', ''))
    : enMsg
  // console.log('decmsg raw: ', len.length, 'en: ', enMsg.length)

  // if (!keyInfo) return ''
  // let msg = ''
  // try {
  //   msg = aesDecrypt(enMsg, keyInfo.key, keyInfo.iv)
  // } catch (err) {
  //   console.log(err)
  // }
  // return msg
}

// export const getSnapshotFilePath = (keyInfo: LX.Sync.KeyInfo): string => {
//   return join(global.lx.snapshotPath, `snapshot_${keyInfo.snapshotKey}.json`)
// }

// export const sendStatus = (status: LX.Sync.ServerStatus) => {
//   syncLog.info('status', status.devices.map(d => `${getUserName(d.clientId) ?? ''} ${d.deviceName}`))
// }

