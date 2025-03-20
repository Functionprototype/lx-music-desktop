/**
 * winMain/rendererEvent/download.ts
 * 下载相关事件处理模块
 * 负责处理与音乐下载相关的渲染进程事件，包括下载列表的获取、添加、更新、删除等操作
 */

import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames' // 导入渲染进程事件名称常量
import { mainHandle } from '@common/mainIpc' // 导入主进程IPC通信工具


/**
 * 初始化下载相关事件处理
 * 注册下载列表的获取、添加、更新、删除等操作的事件处理器
 */
export default () => {
  // 获取下载列表
  mainHandle<LX.Download.ListItem[]>(WIN_MAIN_RENDERER_EVENT_NAME.download_list_get, async() => {
    return global.lx.worker.dbService.getDownloadList() // 从数据库服务获取下载列表
  })
  
  // 添加下载项到列表
  mainHandle<LX.Download.saveDownloadMusicInfo>(WIN_MAIN_RENDERER_EVENT_NAME.download_list_add, async({ params: { list, addMusicLocationType } }) => {
    await global.lx.worker.dbService.downloadInfoSave(list, addMusicLocationType) // 保存下载信息到数据库
  })
  
  // 更新下载列表项
  mainHandle<LX.Download.ListItem[]>(WIN_MAIN_RENDERER_EVENT_NAME.download_list_update, async({ params: list }) => {
    await global.lx.worker.dbService.downloadInfoUpdate(list) // 更新下载信息
  })
  
  // 从下载列表移除项
  mainHandle<string[]>(WIN_MAIN_RENDERER_EVENT_NAME.download_list_remove, async({ params: ids }) => {
    await global.lx.worker.dbService.downloadInfoRemove(ids) // 移除指定ID的下载信息
  })
  
  // 清空下载列表
  mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.download_list_clear, async() => {
    await global.lx.worker.dbService.downloadInfoClear() // 清空所有下载信息
  })
}
