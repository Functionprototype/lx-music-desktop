/**
 * @file 同步模块的工具函数集合
 * 包含加密解密、数据压缩、计算机信息获取等基础功能
 */

import { createCipheriv, createDecipheriv, publicEncrypt, privateDecrypt, constants } from 'node:crypto'
import os from 'node:os'
import fs from 'node:fs'
import zlib from 'node:zlib'
import cp from 'node:child_process'


/**
 * 获取计算机名称
 * 根据不同的操作系统平台获取计算机名称，优先使用系统特定的方法获取
 * Windows: 使用环境变量COMPUTERNAME
 * macOS: 使用scutil命令获取ComputerName
 * Linux: 使用hostnamectl命令获取
 * 如果以上方法都失败，则使用os.hostname()作为后备方案
 * @returns 返回当前计算机的名称
 * @see https://stackoverflow.com/a/75309339
 */
export const getComputerName = () => {
  let name: string | undefined
  switch (process.platform) {
    case 'win32':
      name = process.env.COMPUTERNAME
      break
    case 'darwin':
      try {
        name = cp.execSync('scutil --get ComputerName').toString().trim()
      } catch {}
      break
    case 'linux':
      // Don't fail even if hostnamectl is unavailable
      try {
        name = cp.execSync('hostnamectl --pretty').toString().trim()
      } catch {}
      break
  }
  if (!name) name = os.hostname()
  return name
}

/**
 * 使用gzip压缩数据
 * 将输入的字符串数据使用gzip算法进行压缩，并转换为base64编码
 * @param data 要压缩的字符串数据
 * @returns 返回base64编码的压缩数据，使用Promise异步处理
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
 * 解压gzip数据
 * 将base64编码的gzip压缩数据解压还原为原始字符串
 * @param data base64编码的压缩数据
 * @returns 返回解压后的原始字符串，使用Promise异步处理
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
 * 编码数据，当数据长度超过1024字节时使用gzip压缩
 * 为了优化传输效率，对大数据进行压缩处理
 * 压缩后的数据会添加'cg_'前缀以标识压缩状态
 * @param data 要编码的字符串数据
 * @returns 返回编码后的数据，如果启用压缩则返回带'cg_'前缀的压缩数据
 */
export const encodeData = async(data: string) => {
  return data.length > 1024
    ? 'cg_' + await gzip(data)
    : data
}

/**
 * 解码数据，自动检测并处理gzip压缩的数据
 * 通过检查数据前缀'cg_'来判断是否需要解压
 * @param enData 要解码的数据
 * @returns 返回解码后的原始字符串
 */
export const decodeData = async(enData: string) => {
  return enData.substring(0, 3) == 'cg_'
    ? await unGzip(enData.replace('cg_', ''))
    : enData
}


/**
 * AES加密
 * 使用AES-128-ECB模式对数据进行加密
 * @param text 要加密的明文文本
 * @param key base64编码的AES密钥（128位）
 * @returns 返回base64编码的加密数据
 */
export const aesEncrypt = (text: string, key: string) => {
  const cipher = createCipheriv('aes-128-ecb', Buffer.from(key, 'base64'), '')
  return Buffer.concat([cipher.update(Buffer.from(text)), cipher.final()]).toString('base64')
}

/**
 * AES解密
 * 使用AES-128-ECB模式对加密数据进行解密
 * @param text base64编码的加密数据
 * @param key base64编码的AES密钥（128位）
 * @returns 返回解密后的明文文本
 */
export const aesDecrypt = (text: string, key: string) => {
  const decipher = createDecipheriv('aes-128-ecb', Buffer.from(key, 'base64'), '')
  return Buffer.concat([decipher.update(Buffer.from(text, 'base64')), decipher.final()]).toString()
}

/**
 * RSA公钥加密
 * 使用RSA公钥加密数据，采用PKCS1_OAEP填充方案
 * @param buffer 要加密的二进制数据
 * @param key PEM格式的RSA公钥
 * @returns 返回base64编码的加密数据
 */
export const rsaEncrypt = (buffer: Buffer, key: string): string => {
  return publicEncrypt({ key, padding: constants.RSA_PKCS1_OAEP_PADDING }, buffer).toString('base64')
}
/**
 * RSA私钥解密
 * 使用RSA私钥解密数据，采用PKCS1_OAEP填充方案
 * @param buffer 要解密的二进制数据
 * @param key PEM格式的RSA私钥
 * @returns 返回解密后的原始二进制数据
 */
export const rsaDecrypt = (buffer: Buffer, key: string): Buffer => {
  return privateDecrypt({ key, padding: constants.RSA_PKCS1_OAEP_PADDING }, buffer)
}


/**
 * 检查文件或目录是否存在
 * 使用fs.promises.stat异步检查文件系统中的路径是否存在
 * @param path 要检查的文件或目录的完整路径
 * @returns 返回Promise<boolean>，路径存在返回true，不存在返回false
 */
export const exists = async(path: string) => fs.promises.stat(path).then(() => true).catch(() => false)
