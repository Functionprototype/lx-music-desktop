/**
 * winMain/rendererEvent/kw_decodeLyric.ts
 * 酷我音乐歌词解码模块
 * 负责处理酷我音乐加密歌词的解码，将加密的歌词内容转换为可读的文本格式
 */

import { inflate } from 'zlib' // 导入zlib解压缩功能
import iconv from 'iconv-lite' // 导入字符编码转换工具
import { mainHandle } from '@common/mainIpc' // 导入主进程IPC通信工具
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames' // 导入渲染进程事件名称常量

/**
 * 解压缩歌词数据
 * @param data 压缩的歌词数据Buffer
 * @returns 解压后的Buffer
 */
const handleInflate = async(data: Buffer) => {
  return new Promise((resolve: (result: Buffer) => void, reject) => {
    // 使用zlib的inflate函数解压数据
    inflate(data, (err, result) => {
      if (err) {
        reject(err)
        return
      }
      resolve(result)
    })
  })
}

// 定义解密密钥和长度
const buf_key = Buffer.from('yeelion') // 酷我歌词解密密钥
const buf_key_len = buf_key.length // 密钥长度

/**
 * 解码酷我音乐歌词
 * @param buf 包含加密歌词的Buffer
 * @param isGetLyricx 是否获取增强歌词(逐字歌词)
 * @returns 解码后的歌词文本
 */
const decodeLyric = async(buf: Buffer, isGetLyricx: boolean) => {
  // 检查歌词格式是否正确，必须以'tp=content'开头
  // const info = buf.slice(0, index).toString()
  // if (!info.startsWith('tp=content')) return null
  // const isLyric = info.includes('\r\nlrcx=0\r\n')
  if (buf.toString('utf8', 0, 10) != 'tp=content') return ''
  
  // 找到歌词内容的起始位置并解压
  // const index = buf.indexOf('\r\n\r\n') + 4
  const lrcData = await handleInflate(buf.subarray(buf.indexOf('\r\n\r\n') + 4))

  // 如果不是获取增强歌词，直接解码返回
  if (!isGetLyricx) return iconv.decode(lrcData, 'gb18030')

  // 处理增强歌词(逐字歌词)，需要额外解密
  const buf_str = Buffer.from(lrcData.toString(), 'base64') // 将Base64转为Buffer
  const buf_str_len = buf_str.length // 获取长度
  const output = new Uint8Array(buf_str_len) // 创建输出数组
  
  // 使用密钥进行异或解密
  let i = 0
  while (i < buf_str_len) {
    let j = 0
    while (j < buf_key_len && i < buf_str_len) {
      output[i] = buf_str[i] ^ buf_key[j] // 异或解密
      i++
      j++
    }
  }

  // 将解密后的数据转换为文本并返回
  return iconv.decode(Buffer.from(output), 'gb18030')
}


/**
 * 注册酷我音乐歌词解码事件处理器
 * 接收渲染进程发送的加密歌词，返回解码后的歌词内容
 */
export default () => {
  // 处理酷我音乐歌词解码请求
  mainHandle<{ lrcBase64: string, isGetLyricx: boolean }, string>(WIN_MAIN_RENDERER_EVENT_NAME.handle_kw_decode_lyric, async({ params: { lrcBase64, isGetLyricx } }) => {
    // 解码歌词内容
    const lrc = await decodeLyric(Buffer.from(lrcBase64, 'base64'), isGetLyricx)
    // 将解码后的歌词转为Base64返回
    return Buffer.from(lrc).toString('base64')
  })
}
