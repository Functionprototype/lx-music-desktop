/**
 * winMain/rendererEvent/data.ts
 * 数据存储相关事件处理模块
 * 负责处理与数据存储相关的渲染进程事件，包括数据的获取和保存
 */

import { STORE_NAMES } from '@common/constants' // 导入存储名称常量
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames' // 导入渲染进程事件名称常量
import { mainOn, mainHandle } from '@common/mainIpc' // 导入主进程IPC通信工具
import getStore from '@main/utils/store' // 导入存储工具

/**
 * 初始化数据存储相关事件处理
 * 注册数据获取和保存的事件处理器
 */
export default () => {
  // 处理获取数据请求
  mainHandle<string, any>(WIN_MAIN_RENDERER_EVENT_NAME.get_data, ({ params: path }) => {
    // 根据路径从数据存储中获取数据
    return getStore(STORE_NAMES.DATA).get(path) as any
  })

  // 处理保存数据请求
  mainOn<{
    path: string // 数据存储路径
    data: any    // 要保存的数据
  }>(WIN_MAIN_RENDERER_EVENT_NAME.save_data, ({ params: { path, data } }) => {
    // 将数据保存到指定路径
    getStore(STORE_NAMES.DATA).set(path, data)
  })
}
