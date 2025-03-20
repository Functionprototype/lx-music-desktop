import fs from 'node:fs'
import crypto from 'node:crypto'

/**
 * 同步方式创建目录
 * @param path 要创建的目录路径
 * @throws 如果创建目录失败且错误不是目录已存在，则退出进程
 */
export const createDirSync = (path: string) => {
  if (!fs.existsSync(path)) {
    try {
      fs.mkdirSync(path, { recursive: true })
    } catch (e: any) {
      if (e.code !== 'EEXIST') {
        console.error('Could not set up log directory, error was: ', e)
        process.exit(1)
      }
    }
  }
}

/**
 * 文件名非法字符的正则表达式
 * 包含：\/:*?#"<>|
 */
const fileNameRxp = /[\\/:*?#"<>|]/g

/**
 * 过滤文件名中的非法字符
 * @param name 原始文件名
 * @returns 过滤后的合法文件名
 */
export const filterFileName = (name: string): string => name.replace(fileNameRxp, '')

/**
 * 创建字符串的MD5哈希值
 * @param str 需要计算哈希值的字符串
 * @returns 32位小写MD5哈希值
 */
export const toMD5 = (str: string) => crypto.createHash('md5').update(str).digest('hex')

/**
 * 检查目录是否存在，不存在则创建
 * @param path 目录路径
 */
export const checkAndCreateDirSync = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true })
  }
}
