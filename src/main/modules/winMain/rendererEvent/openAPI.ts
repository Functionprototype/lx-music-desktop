/**
 * winMain/rendererEvent/openAPI.ts
 * 开放API服务模块
 * 负责处理与开放API服务相关的渲染进程事件，包括启动、停止服务和获取服务状态
 */

import { mainHandle } from '@common/mainIpc' // 导入主进程IPC通信工具
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames' // 导入渲染进程事件名称常量
import {
  startServer, // 启动API服务器
  stopServer,  // 停止API服务器
  getStatus,   // 获取服务器状态
} from '@main/modules/openApi'

/**
 * 初始化开放API服务相关事件处理
 * 注册API服务的启动、停止和状态查询事件处理器
 */
export default () => {
  // 处理开放API操作请求
  mainHandle<LX.OpenAPI.Actions, any>(WIN_MAIN_RENDERER_EVENT_NAME.open_api_action, async({ params: data }) => {
    switch (data.action) {
      case 'enable':
        // 根据参数启动或停止服务器
        return data.data.enable ? 
          // 启动服务器，传入端口和是否绑定局域网参数
          await startServer(parseInt(data.data.port), data.data.bindLan) : 
          // 停止服务器
          await stopServer()
      case 'status': 
        // 获取服务器当前状态
        return getStatus()
    }
  })
}
