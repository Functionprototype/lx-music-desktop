/**
 * userApi/index.ts
 * 用户自定义API模块入口文件
 * 负责导出用户API相关功能，包括API列表获取、导入、移除、设置和更新提醒控制等
 */

import { closeWindow } from './main'
import { getUserApis, importApi as handleImportApi, removeApi as handleRemoveApi, setAllowShowUpdateAlert as saveAllowShowUpdateAlert } from './utils'
import { loadApi, setAllowShowUpdateAlert as setRendererEventAllowShowUpdateAlert, init } from './rendererEvent/rendererEvent'

// 当前激活的用户API ID
let userApiId: string | null

/**
 * 获取所有用户API列表
 * @returns 用户API信息列表
 */
export const getApiList = getUserApis

/**
 * 导入用户API
 * @param script API脚本内容
 * @returns 导入结果，包含导入的API信息和更新后的API列表
 */
export const importApi = async(script: string): Promise<LX.UserApi.ImportUserApi> => {
  return {
    apiInfo: await handleImportApi(script),
    apiList: getUserApis(),
  }
}

/**
 * 移除指定的用户API
 * @param ids 要移除的API ID数组
 * @returns 移除后的用户API列表
 */
export const removeApi = async(ids: string[]): Promise<LX.UserApi.UserApiInfo[]> => {
  if (userApiId && ids.includes(userApiId)) {
    userApiId = null
    await closeWindow()
  }
  handleRemoveApi(ids)
  return getUserApis()
}

/**
 * 设置当前使用的API
 * @param id API的唯一标识
 */
export const setApi = async(id: string) => {
  if (userApiId) {
    userApiId = null
    await closeWindow()
  }
  const apiList = getUserApis()
  if (!apiList.some(a => a.id === id)) return
  userApiId ||= id
  await loadApi(id)
}

/**
 * 设置是否允许显示API更新提醒
 * @param id API的唯一标识
 * @param enable 是否启用更新提醒
 */
export const setAllowShowUpdateAlert = (id: string, enable: boolean) => {
  saveAllowShowUpdateAlert(id, enable)
  setRendererEventAllowShowUpdateAlert(id, enable)
}


// 导出rendererEvent模块的所有导出
export * from './rendererEvent/rendererEvent'

/**
 * 初始化用户API模块
 * 注册主窗口关闭事件监听，确保用户API窗口随主窗口关闭
 */
export default () => {
  init()

  global.lx.event_app.on('main_window_close', () => {
    void closeWindow()
  })
}
