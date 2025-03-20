// 导入Electron相关模块，用于与主进程通信和操作渲染进程
// contextBridge: 用于在渲染进程中安全地暴露API
// ipcRenderer: 用于渲染进程向主进程发送消息
// webFrame: 用于操作当前网页的渲染
import { contextBridge, ipcRenderer, webFrame } from 'electron'
// 导入needle模块，用于发送HTTP请求，支持各种HTTP方法和选项
import needle from 'needle'
// 导入zlib模块，用于数据压缩和解压缩，如gzip、deflate等
import zlib from 'zlib'
// 导入加密相关函数，用于数据加密和哈希计算
// createCipheriv: 创建加密器
// publicEncrypt: RSA公钥加密
// constants: 加密常量
// randomBytes: 生成随机字节
// createHash: 创建哈希函数
import { createCipheriv, publicEncrypt, constants, randomBytes, createHash } from 'crypto'
// 导入用户API渲染进程事件名称常量，用于IPC通信
import USER_API_RENDERER_EVENT_NAME from '../rendererEvent/name'
// 导入HTTP隧道模块，用于通过HTTP代理发送HTTP/HTTPS请求
import { httpOverHttp, httpsOverHttp } from 'tunnel'


/**
 * 发送消息到主进程的辅助函数
 * @param {string} action - 事件名称，指定要触发的主进程事件
 * @param {any} data - 要发送的数据
 * @param {boolean} status - 操作状态，true表示成功，false表示失败
 * @param {string} message - 状态消息，通常在失败时提供错误信息
 */
const sendMessage = (action, data, status, message) => {
  ipcRenderer.send(action, { data, status, message })
}

// 标记API是否已初始化，防止重复初始化
let isInitedApi = false
// 代理配置对象，存储HTTP请求代理的主机和端口信息
const proxy = {
  host: '', // 代理服务器主机地址
  port: '', // 代理服务器端口
}
// 标记更新提醒是否已显示，确保更新提醒只显示一次
let isShowedUpdateAlert = false
// 定义支持的事件名称常量，用于事件注册和触发
const EVENT_NAMES = {
  request: 'request',     // 请求事件，用于处理API请求
  inited: 'inited',       // 初始化完成事件，标记API初始化完成
  updateAlert: 'updateAlert', // 更新提醒事件，用于显示API更新信息
}
// 获取所有事件名称的数组，用于验证事件名称是否有效
const eventNames = Object.values(EVENT_NAMES)
// 事件处理函数存储对象，保存各类事件的回调函数
const events = {
  request: null, // 请求事件处理函数，初始为null
}
// 支持的所有音乐源代码，用于遍历和验证
const allSources = ['kw', 'kg', 'tx', 'wy', 'mg', 'local']
// 各音乐源支持的音质列表，定义每个源可用的音质选项
const supportQualitys = {
  kw: ['128k', '320k', 'flac', 'flac24bit'], // 酷我音乐支持的音质
  kg: ['128k', '320k', 'flac', 'flac24bit'], // 酷狗音乐支持的音质
  tx: ['128k', '320k', 'flac', 'flac24bit'], // 腾讯音乐支持的音质
  wy: ['128k', '320k', 'flac', 'flac24bit'], // 网易云音乐支持的音质
  mg: ['128k', '320k', 'flac', 'flac24bit'], // 咪咕音乐支持的音质
  local: [], // 本地音乐支持的音质（无限制）
}
// 各音乐源支持的操作类型，定义每个源可执行的功能
const supportActions = {
  kw: ['musicUrl'], // 酷我音乐支持获取音乐URL
  kg: ['musicUrl'], // 酷狗音乐支持获取音乐URL
  tx: ['musicUrl'], // 腾讯音乐支持获取音乐URL
  wy: ['musicUrl'], // 网易云音乐支持获取音乐URL
  mg: ['musicUrl'], // 咪咕音乐支持获取音乐URL
  xm: ['musicUrl'], // 虾米音乐支持获取音乐URL
  local: ['musicUrl', 'lyric', 'pic'], // 本地音乐支持获取音乐URL、歌词和图片
}

// HTTPS URL正则表达式，用于检测URL是否为HTTPS协议
const httpsRxp = /^https:/
/**
 * 获取请求代理配置的函数
 * @param {string} url - 请求的URL地址
 * @returns {Object|undefined} - 返回代理配置对象或undefined（无代理时）
 * @description 根据URL协议类型选择合适的代理方式：HTTPS请求使用httpsOverHttp，HTTP请求使用httpOverHttp
 */
const getRequestAgent = url => {
  return proxy.host ? (httpsRxp.test(url) ? httpsOverHttp : httpOverHttp)({
    proxy: {
      host: proxy.host, // 代理服务器主机地址
      port: proxy.port, // 代理服务器端口
    },
  }) : undefined // 如果没有设置代理，返回undefined
}

/**
 * 验证歌词信息的函数，确保数据格式正确且大小合适
 * @param {Object} info - 歌词信息对象
 * @returns {Object} - 返回验证并格式化后的歌词对象
 * @throws {Error} - 当歌词格式不正确或大小超限时抛出错误
 * @description 验证歌词数据格式并限制各类歌词的大小，防止过大的歌词数据
 */
const verifyLyricInfo = (info) => {
  // 验证基本格式：必须是对象且包含字符串类型的lyric属性
  if (typeof info != 'object' || typeof info.lyric != 'string') throw new Error('failed')
  // 验证主歌词大小不超过50KB
  if (info.lyric.length > 51200) throw new Error('failed')
  return {
    lyric: info.lyric, // 主歌词内容
    tlyric: (typeof info.tlyric == 'string' && info.tlyric.length < 5120) ? info.tlyric : null, // 翻译歌词（限制5KB）
    rlyric: (typeof info.rlyric == 'string' && info.rlyric.length < 5120) ? info.rlyric : null, // 罗马音歌词（限制5KB）
    lxlyric: (typeof info.lxlyric == 'string' && info.lxlyric.length < 8192) ? info.lxlyric : null, // LX格式歌词（限制8KB）
  }
}

/**
 * 处理用户API请求的函数
 * @param {Object} context - 执行上下文，通常是调用该函数的对象
 * @param {Object} params - 请求参数对象
 * @param {string} params.requestKey - 请求的唯一标识键
 * @param {Object} params.data - 请求的数据内容
 * @description 处理来自主进程的API请求，根据不同的操作类型（musicUrl/lyric/pic）处理响应数据并返回结果
 */
const handleRequest = (context, { requestKey, data }) => {
  // console.log(data) // 调试用，输出请求数据
  // 如果请求事件处理函数未定义，返回错误信息
  if (!events.request) return sendMessage(USER_API_RENDERER_EVENT_NAME.response, { requestKey }, false, 'Request event is not defined')
  try {
    // 调用用户定义的请求处理函数，并使用Promise处理异步响应
    events.request.call(context, { source: data.source, action: data.action, info: data.info }).then(response => {
      // 创建响应数据对象，包含请求标识
      let sendData = {
        requestKey,
      }
      // 根据不同的操作类型处理响应数据
      switch (data.action) {
        case 'musicUrl': // 处理音乐URL请求
          // 验证URL格式：必须是字符串，长度不超过2048，且以http或https开头
          if (typeof response != 'string' || response.length > 2048 || !/^https?:/.test(response)) throw new Error('failed')
          sendData.result = {
            source: data.source,
            action: data.action,
            data: {
              type: data.info.type,
              url: response,
            },
          }
          break
        case 'lyric': // 处理歌词请求
          // 验证并格式化歌词信息
          sendData.result = {
            source: data.source,
            action: data.action,
            data: verifyLyricInfo(response),
          }
          break
        case 'pic': // 处理图片请求
          // 验证图片URL格式：必须是字符串，长度不超过2048，且以http或https开头
          if (typeof response != 'string' || response.length > 2048 || !/^https?:/.test(response)) throw new Error('failed')
          sendData.result = {
            source: data.source,
            action: data.action,
            data: response,
          }
          break
      }
      // 发送成功响应到主进程
      sendMessage(USER_API_RENDERER_EVENT_NAME.response, sendData, true)
    }).catch(err => {
      // 发送错误响应到主进程，包含错误信息
      sendMessage(USER_API_RENDERER_EVENT_NAME.response, { requestKey }, false, err.message)
    })
  } catch (err) {
    // 捕获并发送处理过程中的错误到主进程
    sendMessage(USER_API_RENDERER_EVENT_NAME.response, { requestKey }, false, err.message)
  }
}
/**
 * 处理用户API初始化
 * @param {*} context 上下文对象
 * @param {*} info {
 *                    openDevTools: false, // 是否打开开发者工具
 *                    message: 'xxx',      // 消息
 *                    sources: {           // 支持的音乐源和音质
 *                         kw: ['128k', '320k', 'flac', 'flac24bit'],
 *                         kg: ['128k', '320k', 'flac', 'flac24bit'],
 *                         tx: ['128k', '320k', 'flac', 'flac24bit'],
 *                         wy: ['128k', '320k', 'flac', 'flac24bit'],
 *                         mg: ['128k', '320k', 'flac', 'flac24bit'],
 *                     }
 *                 }
 */
const handleInit = (context, info) => {
  // 检查初始化信息是否存在
  if (!info) {
    sendMessage(USER_API_RENDERER_EVENT_NAME.init, null, false, 'Missing required parameter init info')
    // sendMessage(USER_API_RENDERER_EVENT_NAME.init, false, null, typeof info.message === 'string' ? info.message.substring(0, 100) : '')
    return
  }
  // 如果需要打开开发者工具
  if (info.openDevTools === true) {
    sendMessage(USER_API_RENDERER_EVENT_NAME.openDevTools)
  }
  // if (!info.status) {
  //   sendMessage(USER_API_RENDERER_EVENT_NAME.init, null, false, 'Missing required parameter init info')
  //   // sendMessage(USER_API_RENDERER_EVENT_NAME.init, false, null, typeof info.message === 'string' ? info.message.substring(0, 100) : '')
  //   return
  // }
  // 创建源信息对象
  const sourceInfo = {
    sources: {},
  }
  try {
    // 遍历所有支持的音乐源
    for (const source of allSources) {
      const userSource = info.sources[source]
      // 如果用户未提供该源或类型不是音乐，则跳过
      if (!userSource || userSource.type !== 'music') continue
      const qualitys = supportQualitys[source]
      const actions = supportActions[source]
      // 过滤出用户支持的操作和音质
      sourceInfo.sources[source] = {
        type: 'music',
        actions: actions.filter(a => userSource.actions.includes(a)),
        qualitys: qualitys.filter(q => userSource.qualitys.includes(q)),
      }
    }
  } catch (error) {
    console.log(error)
    // 发送初始化失败消息
    sendMessage(USER_API_RENDERER_EVENT_NAME.init, null, false, error.message)
    return
  }
  // 发送初始化成功消息
  sendMessage(USER_API_RENDERER_EVENT_NAME.init, sourceInfo, true)

  // 监听请求事件
  ipcRenderer.on(USER_API_RENDERER_EVENT_NAME.request, (event, data) => {
    handleRequest(context, data)
  })
}

/**
 * 处理显示更新提醒的函数
 * @param {Object} data - 更新信息数据对象
 * @param {Function} resolve - Promise成功回调函数
 * @param {Function} reject - Promise失败回调函数
 * @description 验证更新信息数据，限制日志长度，并发送更新提醒消息到主进程
 */
const handleShowUpdateAlert = (data, resolve, reject) => {
  // 验证参数格式：必须是对象类型
  if (!data || typeof data != 'object') return reject(new Error('parameter format error.'))
  // 验证日志内容：必须存在且为字符串类型
  if (!data.log || typeof data.log != 'string') return reject(new Error('log is required.'))
  // 验证更新URL格式：必须是有效的HTTP/HTTPS URL且长度不超过1024
  if (data.updateUrl && !/^https?:\/\/[^\s$.?#].[^\s]*$/.test(data.updateUrl) && data.updateUrl.length > 1024) delete data.updateUrl
  // 限制日志长度：超过1024字符的部分将被截断
  if (data.log.length > 1024) data.log = data.log.substring(0, 1024) + '...'
  // 发送显示更新提醒消息到主进程
  sendMessage(USER_API_RENDERER_EVENT_NAME.showUpdateAlert, {
    log: data.log,
    updateUrl: data.updateUrl,
  })
  // 完成Promise
  resolve()
}

/**
 * 处理错误的函数
 * @param {string} errorMessage - 错误消息文本
 * @description 处理初始化过程中的错误，限制错误消息长度，并发送初始化失败消息到主进程
 * @note 该函数只在API未初始化时执行，防止重复报告错误
 */
const onError = (errorMessage) => {
  // 如果API已初始化，则忽略错误，防止重复初始化
  if (isInitedApi) return
  // 标记API已初始化，防止后续错误触发重复初始化
  isInitedApi = true
  // 限制错误消息长度：超过1024字符的部分将被截断
  if (errorMessage.length > 1024) errorMessage = errorMessage.substring(0, 1024) + '...'
  // 发送初始化失败消息到主进程
  sendMessage(USER_API_RENDERER_EVENT_NAME.init, null, false, errorMessage)
}

/**
 * 初始化环境的函数
 * @param {Object} userApi - 用户API配置信息对象
 * @param {Object} userApi.proxy - 代理服务器配置
 * @param {string} userApi.proxy.host - 代理服务器主机地址
 * @param {string} userApi.proxy.port - 代理服务器端口
 * @param {string} userApi.name - API名称
 * @param {string} userApi.description - API描述
 * @param {string} userApi.version - API版本
 * @param {string} userApi.author - API作者
 * @param {string} userApi.homepage - API主页
 * @param {string} userApi.script - API脚本内容
 * @description 初始化用户API环境，设置代理信息，并将API暴露到渲染进程的全局对象中
 */
const initEnv = (userApi) => {
  // 设置代理信息，用于后续HTTP请求
  proxy.host = userApi.proxy.host
  proxy.port = userApi.proxy.port

  // 将API暴露到渲染进程的全局对象中
  contextBridge.exposeInMainWorld('lx', {
    // 事件名称常量
    EVENT_NAMES,
    // HTTP请求函数
    request(url, { method = 'get', timeout, headers, body, form, formData }, callback) {
      let options = {
        headers,
        agent: getRequestAgent(url),
      }
      let data
      // 根据不同的请求类型设置数据
      if (body) {
        data = body
      } else if (form) {
        data = form
        // data.content_type = 'application/x-www-form-urlencoded'
        options.json = false
      } else if (formData) {
        data = formData
        // data.content_type = 'multipart/form-data'
        options.json = false
      }
      // 设置请求超时时间，最大60秒
      options.response_timeout = typeof timeout == 'number' && timeout > 0 ? Math.min(timeout, 60_000) : 60_000

      // 发送请求
      let request = needle.request(method, url, data, options, (err, resp, body) => {
        // console.log(err, resp, body)
        try {
          if (err) {
            // 处理错误
            callback.call(this, err, null, null)
          } else {
            // 处理响应
            body = resp.body = resp.raw.toString()
            try {
              // 尝试解析JSON
              resp.body = JSON.parse(resp.body)
            } catch (_) {}
            body = resp.body
            // 调用回调函数
            callback.call(this, err, {
              statusCode: resp.statusCode,
              statusMessage: resp.statusMessage,
              headers: resp.headers,
              bytes: resp.bytes,
              raw: resp.raw,
              body,
            }, body)
          }
        } catch (err) {
          onError(err.message)
        }
      }).request

      return () => {
        if (!request.aborted) request.abort()
        request = null
      }
    },
    send(eventName, data) {
      return new Promise((resolve, reject) => {
        if (!eventNames.includes(eventName)) return reject(new Error('The event is not supported: ' + eventName))
        switch (eventName) {
          case EVENT_NAMES.inited:
            if (isInitedApi) return reject(new Error('Script is inited'))
            isInitedApi = true
            handleInit(this, data)
            resolve()
            break
          case EVENT_NAMES.updateAlert:
            if (isShowedUpdateAlert) return reject(new Error('The update alert can only be called once.'))
            isShowedUpdateAlert = true
            handleShowUpdateAlert(data, resolve, reject)
            break
          default:
            reject(new Error('Unknown event name: ' + eventName))
        }
      })
    },
    on(eventName, handler) {
      if (!eventNames.includes(eventName)) return Promise.reject(new Error('The event is not supported: ' + eventName))
      switch (eventName) {
        case EVENT_NAMES.request:
          events.request = handler
          break
        default: return Promise.reject(new Error('The event is not supported: ' + eventName))
      }
      return Promise.resolve()
    },
    utils: {
      crypto: {
        aesEncrypt(buffer, mode, key, iv) {
          const cipher = createCipheriv(mode, key, iv)
          return Buffer.concat([cipher.update(buffer), cipher.final()])
        },
        rsaEncrypt(buffer, key) {
          buffer = Buffer.concat([Buffer.alloc(128 - buffer.length), buffer])
          return publicEncrypt({ key, padding: constants.RSA_NO_PADDING }, buffer)
        },
        randomBytes(size) {
          return randomBytes(size)
        },
        md5(str) {
          return createHash('md5').update(str).digest('hex')
        },
      },
      buffer: {
        from(...args) {
          return Buffer.from(...args)
        },
        bufToString(buf, format) {
          return Buffer.from(buf, 'binary').toString(format)
        },
      },
      zlib: {
        inflate(buf) {
          return new Promise((resolve, reject) => {
            zlib.inflate(buf, (err, data) => {
              if (err) reject(new Error(err.message))
              else resolve(data)
            })
          })
        },
        deflate(data) {
          return new Promise((resolve, reject) => {
            zlib.deflate(data, (err, buf) => {
              if (err) reject(new Error(err.message))
              else resolve(buf)
            })
          })
        },
      },
    },
    currentScriptInfo: {
      name: userApi.name,
      description: userApi.description,
      version: userApi.version,
      author: userApi.author,
      homepage: userApi.homepage,
      rawScript: userApi.script,
    },
    version: '2.0.0',
    env: 'desktop',
    // removeEvent(eventName, handler) {
    //   if (!eventNames.includes(eventName)) return Promise.reject(new Error('The event is not supported: ' + eventName))
    //   let handlers
    //   switch (eventName) {
    //     case EVENT_NAMES.request:
    //       handlers = events.request
    //       break
    //   }
    //   for (let index = 0; index < handlers.length; index++) {
    //     if (handlers[index] === handler) {
    //       handlers.splice(index, 1)
    //       break
    //     }
    //   }
    // },
    // removeAllEvents() {
    //   for (const handlers of Object.values(events)) {
    //     handlers.splice(0, handlers.length)
    //   }
    // },
  })

  contextBridge.exposeInMainWorld('__lx_init_error_handler__', {
    sendError(errorMessage) {
      onError(errorMessage)
    },
  })

  webFrame.executeJavaScript(`(() => {
window.addEventListener('error', (event) => {
  if (event.isTrusted) globalThis.__lx_init_error_handler__.sendError(event.message.replace(/^Uncaught\\sError:\\s/, ''))
})
window.addEventListener('unhandledrejection', (event) => {
  if (!event.isTrusted) return
  const message = typeof event.reason === 'string' ? event.reason : event.reason?.message ?? String(event.reason)
  globalThis.__lx_init_error_handler__.sendError(message.replace(/^Error:\\s/, ''))
})
})()`)

  webFrame.executeJavaScript(userApi.script).catch(_ => _)
}


/**
 * 监听初始化环境事件
 * 当主进程发送初始化环境事件时，调用initEnv函数初始化用户API环境
 */
ipcRenderer.on(USER_API_RENDERER_EVENT_NAME.initEnv, (event, data) => {
  initEnv(data)
})

/**
 * 监听代理更新事件
 * 当主进程发送代理更新事件时，更新当前的代理配置信息
 */
ipcRenderer.on(USER_API_RENDERER_EVENT_NAME.proxyUpdate, (event, data) => {
  // 更新代理服务器主机地址
  proxy.host = data.host
  // 更新代理服务器端口
  proxy.port = data.port
})
