/**
 * userApi/rendererEvent/rendererEvent.ts
 * 用户自定义API渲染进程事件处理模块
 * 负责处理渲染进程与主进程之间的通信，管理API请求队列和状态更新
 */

import { mainOn } from '@common/mainIpc'

import USER_API_RENDERER_EVENT_NAME from './name'
import { createWindow, getProxy, openDevTools, sendEvent } from '../main'
import { getUserApis } from '../utils'
import { sendShowUpdateAlert, sendStatusChange } from '@main/modules/winMain'

// 当前加载的用户API信息
let userApi: LX.UserApi.UserApiInfo
// API状态信息，包含加载状态和错误信息
let apiStatus: LX.UserApi.UserApiStatus = { status: true }
// 请求队列，存储待处理的API请求
const requestQueue = new Map()
// 请求超时计时器映射表
const timeouts = new Map<string, NodeJS.Timeout>()

// 初始化参数接口定义
interface InitParams {
  params: {
    status: boolean
    message: string
    data: LX.UserApi.UserApiInfo
  }
}

// 响应参数接口定义
interface ResponseParams {
  params: {
    status: boolean
    message: string
    data: {
      requestKey: string
      result: any
    }
  }
}

// 更新信息参数接口定义
interface UpdateInfoParams {
  params: {
    data: {
      log: string
      updateUrl: string
    }
  }
}

/**
 * 初始化事件监听
 * 注册各种IPC事件处理函数，处理渲染进程发来的消息
 */
export const init = () => {
  // 处理API初始化事件
  const handleInit = ({ params: { status, message, data: apiInfo } }: InitParams) => {
    // 更新API状态信息
    apiStatus = status
      ? { status: true, apiInfo: { ...userApi, sources: apiInfo.sources } }
      : { status: false, apiInfo: userApi, message }
    sendStatusChange(apiStatus)
  }
  
  // 处理API响应事件
  const handleResponse = ({ params: { status, data: { requestKey, result }, message } }: ResponseParams) => {
    const request = requestQueue.get(requestKey)
    if (!request) return
    requestQueue.delete(requestKey)
    clearRequestTimeout(requestKey)
    if (status) {
      request[0](result)
    } else {
      request[1](new Error(message))
    }
  }
  
  // 处理打开开发者工具事件
  const handleOpenDevTools = () => {
    openDevTools()
  }
  
  // 处理显示更新提醒事件
  const handleShowUpdateAlert = ({ params: { data } }: UpdateInfoParams) => {
    if (!userApi.allowShowUpdateAlert) return
    sendShowUpdateAlert({
      name: userApi.name,
      description: userApi.description,
      log: data.log,
      updateUrl: data.updateUrl,
    })
  }
  
  // 处理获取代理设置事件
  const handleGetProxy = () => {
    sendEvent(USER_API_RENDERER_EVENT_NAME.proxyUpdate, getProxy())
  }
  
  // 注册所有事件监听
  mainOn(USER_API_RENDERER_EVENT_NAME.init, handleInit)
  mainOn(USER_API_RENDERER_EVENT_NAME.response, handleResponse)
  mainOn(USER_API_RENDERER_EVENT_NAME.openDevTools, handleOpenDevTools)
  mainOn(USER_API_RENDERER_EVENT_NAME.showUpdateAlert, handleShowUpdateAlert)
  mainOn(USER_API_RENDERER_EVENT_NAME.getProxy, handleGetProxy)
}

/**
 * 清除请求超时计时器
 * @param requestKey 请求的唯一标识
 */
export const clearRequestTimeout = (requestKey: string) => {
  const timeout = timeouts.get(requestKey)
  if (timeout) {
    clearTimeout(timeout)
    timeouts.delete(requestKey)
  }
}

/**
 * 加载指定的用户API
 * 创建API窗口并初始化环境
 * @param apiId API的唯一标识
 */
export const loadApi = async(apiId: string) => {
  if (!apiId) {
    apiStatus = { status: false, message: 'api id is null' }
    sendStatusChange(apiStatus)
    return
  }
  const targetApi = getUserApis().find(api => api.id == apiId)
  if (!targetApi) throw new Error('api not found')
  userApi = targetApi
  console.log('load api', userApi.name)
  await createWindow(userApi)
}

/**
 * 取消指定的API请求
 * 从请求队列中移除请求
 */
export const cancelRequest = (requestKey: string) => {
  if (!requestQueue.has(requestKey)) return
  const request = requestQueue.get(requestKey)
  request[1](new Error('Cancel request'))
  requestQueue.delete(requestKey)
  clearRequestTimeout(requestKey)
}

/**
 * 发送API请求并等待响应
 * 将请求添加到队列并设置超时处理
 * @param requestParams 请求参数对象
 * @returns 请求结果的Promise
 */
export const request = async({ requestKey, data }: LX.UserApi.UserApiRequestParams): Promise<any> => await new Promise((resolve, reject) => {
  if (!userApi) {
    reject(new Error('user api is not load'))
  }

  // 清除已存在的同名请求
  const timeout = timeouts.get(requestKey)
  if (timeout) {
    clearTimeout(timeout)
    timeouts.delete(requestKey)
    cancelRequest(requestKey)
  }

  // 设置请求超时（20秒）
  timeouts.set(requestKey, setTimeout(() => {
    cancelRequest(requestKey)
  }, 20000))

  // 将请求添加到队列
  requestQueue.set(requestKey, [resolve, reject, data])
  sendRequest({ requestKey, data })
})

/**
 * 获取当前API状态
 * @returns API状态信息对象
 */
export const getStatus = (): LX.UserApi.UserApiStatus => apiStatus

/**
 * 设置是否允许显示API更新提醒
 * @param id API的唯一标识
 * @param enable 是否启用更新提醒
 */
export const setAllowShowUpdateAlert = (id: string, enable: boolean) => {
  if (!userApi || userApi.id != id) return
  userApi.allowShowUpdateAlert = enable
}

/**
 * 发送请求到渲染进程
 * @param reqData 请求数据对象
 */
export const sendRequest = (reqData: { requestKey: string, data: any }) => {
  sendEvent(USER_API_RENDERER_EVENT_NAME.request, reqData)
}
