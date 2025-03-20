/**
 * request.ts
 * HTTP请求工具模块
 * 负责处理应用程序的网络请求，支持代理设置、请求超时处理和错误处理等功能
 */

import needle, { type NeedleHttpVerbs, type NeedleOptions, type BodyData, type NeedleCallback, type NeedleResponse } from 'needle'
// import progress from 'request-progress'
import { httpOverHttp, httpsOverHttp } from 'tunnel'
import { type ClientRequest } from 'node:http'
import { getProxy } from './index'
// import fs from 'fs'

/**
 * 请求错误消息常量
 * 定义各种网络请求错误的友好提示信息
 */
export const requestMsg = {
  fail: '请求异常😮，可以多试几次，若还是不行就换一首吧。。。',
  unachievable: '哦No😱...接口无法访问了！',
  timeout: '请求超时',
  // unachievable: '哦No😱...接口无法访问了！已帮你切换到临时接口，重试下看能不能播放吧~',
  notConnectNetwork: '无法连接到服务器',
  cancelRequest: '取消http请求',
} as const


// HTTPS URL正则表达式
const httpsRxp = /^https:/

/**
 * 获取请求代理
 * 根据URL类型和代理设置返回适当的代理代理
 * @param url 请求URL
 * @returns 代理配置或undefined
 */
const getRequestAgent = (url: string) => {
  const proxy = getProxy() // 获取代理设置
  return proxy ? (httpsRxp.test(url) ? httpsOverHttp : httpOverHttp)({ proxy }) : undefined
}

/**
 * 请求选项接口
 * 扩展Needle库的请求选项，添加额外的请求数据字段
 */
export interface RequestOptions extends NeedleOptions {
  method?: NeedleHttpVerbs // 请求方法
  body?: BodyData         // 请求体数据
  form?: BodyData         // 表单数据
  formData?: BodyData     // 多部分表单数据
}

// 请求回调函数类型
export type RequestCallback = NeedleCallback

// 请求响应类型
type RequestResponse = NeedleResponse
/**
 * 基础请求函数
 * 处理不同类型的请求数据，并执行HTTP请求
 * @param url 请求URL
 * @param options 请求选项
 * @param callback 回调函数
 * @returns 客户端请求对象
 */
const request = (url: string, options: RequestOptions, callback: RequestCallback): ClientRequest => {
  let data: BodyData = null
  if (options.body) {
    data = options.body
  } else if (options.form) {
    data = options.form
    // data.content_type = 'application/x-www-form-urlencoded'
    options.json = false
  } else if (options.formData) {
    data = options.formData
    // data.content_type = 'multipart/form-data'
    options.json = false
  }
  options.response_timeout = options.timeout

  return needle.request(options.method ?? 'get', url, data, options, (err, resp, body) => {
    if (!err) {
      body = resp.body = resp.raw.toString()
      try {
        resp.body = JSON.parse(resp.body)
      } catch (_) {}
      body = resp.body
    }
    callback(err, resp, body)
    // @ts-expect-error
  }).request
}


/**
 * 默认请求头
 * 设置默认的User-Agent以模拟浏览器请求
 */
const defaultHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
}
// var proxyUrl = "http://" + user + ":" + password + "@" + host + ":" + port;
// var proxiedRequest = request.defaults({'proxy': proxyUrl});

// interface RequestPromise extends Promise<RequestResponse> {
//   abort: () => void
// }

/**
 * promise 形式的请求方法
 * @param {*} url
 * @param {*} options
 */
/**
 * 构建HTTP请求Promise
 * 将回调式的HTTP请求转换为Promise形式
 * @param url 请求URL
 * @param options 请求选项
 * @returns Promise对象，解析为请求响应
 */
const buildHttpPromose = async(url: string, options: RequestOptions): Promise<RequestResponse> => {
  return new Promise((resolve, reject) => {
    void fetchData(url, options.method, options, (err, resp, body) => {
      // options.isShowProgress && window.api.hideProgress()
      // debugRequest && console.log(`\n---response------${url}------------`)
      // debugRequest && console.log(body)
      // obj.requestObj = null
      // obj.cancelFn = null
      if (err) {
        reject(err)
        return
      }
      resolve(resp)
    })
    // .then(request => {
    //   // obj.requestObj = ro
    //   // if (obj.isCancelled) obj.cancelHttp()
    //   promise.abort = () => {
    //     request.destroy(new Error('cancelled'))
    //   }
    // })
  })
  // let obj = {
  //   isCancelled: false,
  //   cancelHttp: () => {
  //     if (!obj.requestObj) return obj.isCancelled = true
  //     cancelHttp(obj.requestObj)
  //     obj.requestObj = null
  //     obj.promise = obj.cancelHttp = null
  //     obj.cancelFn(new Error(requestMsg.cancelRequest))
  //     obj.cancelFn = null
  //   },
  // }
  // obj.promise = new Promise((resolve, reject) => {
  //   obj.cancelFn = reject
  //   debugRequest && console.log(`\n---send request------${url}------------`)
  //   fetchData(url, options.method, options, (err, resp, body) => {
  //     // options.isShowProgress && window.api.hideProgress()
  //     debugRequest && console.log(`\n---response------${url}------------`)
  //     debugRequest && console.log(body)
  //     obj.requestObj = null
  //     obj.cancelFn = null
  //     if (err) { reject(err); return }
  //     resolve(resp)
  //   }).then(ro => {
  //     obj.requestObj = ro
  //     if (obj.isCancelled) obj.cancelHttp()
  //   })
  // })
  // return obj
}

/**
 * 请求超时自动重试
 * @param {*} url
 * @param {*} options
 */
/**
 * HTTP请求函数
 * 执行HTTP请求并处理常见错误，支持自动重试
 * @param url 请求URL
 * @param options 请求选项，默认为GET请求
 * @returns Promise对象，解析为请求响应
 */
export const httpFetch = async(url: string, options: RequestOptions = { method: 'get' }) => {
  return buildHttpPromose(url, options).catch(async(err: any) => {
    // console.log('出错', err)
    if (err.message === 'socket hang up') {
      // window.globalObj.apiSource = 'temp'
      throw new Error(requestMsg.unachievable)
    }
    switch (err.code) {
      case 'ETIMEDOUT':
      case 'ESOCKETTIMEDOUT':
        throw new Error(requestMsg.timeout)
      case 'ENOTFOUND':
        throw new Error(requestMsg.notConnectNetwork)
      default:
        throw err
    }
  })
  // requestObj.promise = requestObj.promise.catch(async err => {
  //   // console.log('出错', err)
  //   if (err.message === 'socket hang up') {
  //     // window.globalObj.apiSource = 'temp'
  //     return Promise.reject(new Error(requestMsg.unachievable))
  //   }
  //   switch (err.code) {
  //     case 'ETIMEDOUT':
  //     case 'ESOCKETTIMEDOUT':
  //       return Promise.reject(new Error(requestMsg.timeout))
  //     case 'ENOTFOUND':
  //       return Promise.reject(new Error(requestMsg.notConnectNetwork))
  //     default:
  //       return Promise.reject(err)
  //   }
  // })
  // return requestPromise
}

/**
 * 获取数据函数
 * 执行实际的HTTP请求，设置请求头和超时等选项
 * @param url 请求URL
 * @param method 请求方法
 * @param options 请求选项对象，包含headers、format、timeout等
 * @param callback 回调函数
 * @returns 客户端请求对象
 */
const fetchData = async(url: string, method: RequestOptions['method'], {
  headers = {},       // 请求头
  format = 'json',    // 响应格式，默认为JSON
  timeout = 15000,    // 超时时间，默认15秒
  ...options          // 其他选项
}, callback: RequestCallback) => {
  // console.log(url, options)
  console.log('---start---', url)
  headers = Object.assign({}, headers)

  return request(url, {
    ...options,
    method,
    headers: Object.assign({}, defaultHeaders, headers),
    timeout,
    agent: getRequestAgent(url),
    json: format === 'json',
  }, (err, resp, body) => {
    callback(err, resp, body)
  })
}
