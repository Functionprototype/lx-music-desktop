/**
 * winMain/rendererEvent/tx_decodeLyric.ts
 * 腾讯音乐歌词解码模块
 * 负责处理腾讯音乐加密歌词的解码，将加密的歌词内容转换为可读的文本格式
 */

import { createInflate, constants as zlibConstants } from 'node:zlib' // 导入zlib解压缩相关功能
// import path from 'path'
import { mainHandle } from '@common/mainIpc' // 导入主进程IPC通信工具
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames' // 导入渲染进程事件名称常量

// eslint-disable-next-line @typescript-eslint/dot-notation, @typescript-eslint/quotes
// const require = module[`require`].bind(module)

/**
 * 腾讯音乐歌词解码函数类型定义
 * 接收加密的Buffer和长度，返回解码后的Buffer
 */
let qrc_decode: (buf: Buffer, len: number) => Buffer

/**
 * 解压缩歌词数据
 * @param lrcBuf 压缩的歌词数据Buffer
 * @returns 解压后的歌词文本
 */
const inflate = async(lrcBuf: Buffer) => new Promise<string>((resolve, reject) => {
  // 用于存储解压过程中的数据块
  const buffer_builder: Buffer[] = []
  // 创建解压缩流
  const decompress_stream = createInflate()
    // 接收解压的数据块
    .on('data', (chunk) => {
      buffer_builder.push(chunk)
    })
    // 解压完成时，将所有数据块合并并转换为字符串
    .on('close', () => {
      resolve(Buffer.concat(buffer_builder).toString())
    })
    // 处理解压错误，忽略预期的EOF错误
    .on('error', (err: any) => {
      // console.log(err)
      if (err.errno !== zlibConstants.Z_BUF_ERROR) { // EOF: expected
        reject(err)
      }
    })
  // 将数据写入解压缩流并结束
  // decompress_stream.write(lrcBuf)
  decompress_stream.end(lrcBuf)
})

/**
 * 解码加密的歌词字符串
 * @param str 十六进制格式的加密歌词字符串
 * @returns 解码后的歌词文本
 */
const decode = async(str: string): Promise<string> => {
  // 空字符串直接返回空
  if (!str) return ''
  // 将十六进制字符串转换为Buffer
  const buf = Buffer.from(str, 'hex')
  // 先使用C++解码函数解码，再解压缩
  return inflate(qrc_decode(buf, buf.length))
}


// 感谢某位不愿透露姓名的大佬提供的C++算法源码，但由于作者不希望公开，所以将会以预构建二进制文件的形式加入代码仓库中
/**
 * 处理腾讯音乐歌词解码
 * @param lrc 原始歌词加密字符串
 * @param tlrc 翻译歌词加密字符串
 * @param rlrc 罗马音歌词加密字符串
 * @returns 包含解码后的三种歌词的对象
 */
const handleDecode = async(lrc: string, tlrc: string, rlrc: string) => {
  // 首次调用时加载C++解码模块
  if (!qrc_decode) {
    // 加载预构建的二进制模块
    // const nativeBindingPath = path.join(__dirname, '../build/Release/qrc_decode.node')
    // const nativeBindingPath = process.env.NODE_ENV !== 'production' ? path.join(__dirname, '../build/Release/qrc_decode.node')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const addon = require('qrc_decode.node')
    // console.log(addon)
    qrc_decode = addon.qrc_decode
  }

  // 并行解码三种歌词
  const [lyric, tlyric, rlyric] = await Promise.all([decode(lrc), decode(tlrc), decode(rlrc)])
  // 返回解码结果
  return {
    lyric,    // 原始歌词
    tlyric,   // 翻译歌词
    rlyric,   // 罗马音歌词
  }
}

/**
 * 注册腾讯音乐歌词解码事件处理器
 * 接收渲染进程发送的加密歌词，返回解码后的歌词内容
 */
export default () => {
  // 处理腾讯音乐歌词解码请求
  mainHandle<{ lrc: string, tlrc: string, rlrc: string }, { lyric: string, tlyric: string, rlyric: string }>(WIN_MAIN_RENDERER_EVENT_NAME.handle_tx_decode_lyric, async({ params: { lrc, tlrc, rlrc } }) => {
    // 调用解码函数并返回结果
    return handleDecode(lrc, tlrc, rlrc)
  })
}
