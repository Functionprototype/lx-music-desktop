/**
 * winMain/rendererEvent/userApi.ts
 * 用户自定义API模块
 * 负责处理用户自定义API的导入、移除、设置、请求等操作，实现与渲染进程的通信
 */

import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames' // 导入渲染进程事件名称常量
import { mainHandle } from '@common/mainIpc' // 导入主进程IPC通信工具
import {
  getApiList,      // 获取API列表
  importApi,       // 导入API
  removeApi,       // 移除API
  setApi,          // 设置当前使用的API
  getStatus,       // 获取API状态
  request,         // 发送API请求
  cancelRequest,   // 取消API请求
  setAllowShowUpdateAlert, // 设置是否允许显示API更新提醒
} from '@main/modules/userApi'
import { sendEvent } from '@main/modules/winMain/main' // 导入发送事件函数

/**
 * 注册用户自定义API相关的渲染进程事件处理器
 * 处理API的导入、移除、设置、请求等操作
 */
export default () => {
  // 处理导入用户API的请求
  mainHandle<string, LX.UserApi.ImportUserApi>(WIN_MAIN_RENDERER_EVENT_NAME.import_user_api, async({ params: script }) => {
    // 导入API脚本并返回导入结果
    return importApi(script)
  })

  // 处理移除用户API的请求
  mainHandle<string[], LX.UserApi.UserApiInfo[]>(WIN_MAIN_RENDERER_EVENT_NAME.remove_user_api, async({ params: apiIds }) => {
    // 移除指定ID的API并返回更新后的API列表
    return removeApi(apiIds)
  })

  // 处理设置当前使用API的请求
  mainHandle<LX.UserApi.UserApiSetApiParams>(WIN_MAIN_RENDERER_EVENT_NAME.set_user_api, async({ params: apiId }) => {
    // 设置当前使用的API
    await setApi(apiId)
  })

  // 处理获取API列表的请求
  mainHandle<LX.UserApi.UserApiInfo[]>(WIN_MAIN_RENDERER_EVENT_NAME.get_user_api_list, async() => {
    // 返回所有可用的API列表
    return getApiList()
  })

  // 处理获取API状态的请求
  mainHandle<LX.UserApi.UserApiStatus>(WIN_MAIN_RENDERER_EVENT_NAME.get_user_api_status, async() => {
    // 返回当前API的状态信息
    return getStatus()
  })

  // 处理设置是否允许显示API更新提醒的请求
  mainHandle<LX.UserApi.UserApiSetAllowUpdateAlertParams>(WIN_MAIN_RENDERER_EVENT_NAME.user_api_set_allow_update_alert, async({ params: { id, enable } }) => {
    // 设置指定API是否允许显示更新提醒
    setAllowShowUpdateAlert(id, enable)
  })

  // 处理发送API请求
  mainHandle<LX.UserApi.UserApiRequestParams>(WIN_MAIN_RENDERER_EVENT_NAME.request_user_api, async({ params }) => {
    // 发送API请求并返回结果
    return request(params)
  })
  
  // 处理取消API请求
  mainHandle<LX.UserApi.UserApiRequestCancelParams>(WIN_MAIN_RENDERER_EVENT_NAME.request_user_api_cancel, async({ params: requestKey }) => {
    // 取消指定的API请求
    cancelRequest(requestKey)
  })
}

/**
 * 发送API状态变更事件到渲染进程
 * @param status API状态信息对象
 */
export const sendStatusChange = (status: LX.UserApi.UserApiStatus) => {
  sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.user_api_status, status)
}

/**
 * 发送API更新提醒事件到渲染进程
 * @param info API更新信息对象
 */
export const sendShowUpdateAlert = (info: LX.UserApi.UserApiUpdateInfo) => {
  sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.user_api_show_update_alert, info)
}

