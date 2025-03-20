/**
 * winMain/rendererEvent/sync.ts
 * 同步相关事件处理模块
 * 负责处理与数据同步相关的渲染进程事件，包括服务器启动/停止、客户端连接/断开等操作
 */

import { mainHandle } from '@common/mainIpc' // 导入主进程IPC通信工具
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames' // 导入渲染进程事件名称常量
import {
  startServer,       // 启动同步服务器
  stopServer,        // 停止同步服务器
  getServerStatus,   // 获取服务器状态
  generateCode,      // 生成授权码
  connectServer,     // 连接到同步服务器
  disconnectServer,  // 断开与同步服务器的连接
  getClientStatus,   // 获取客户端状态
  getServerDevices,  // 获取服务器设备列表
  removeServerDevice, // 移除服务器设备
} from '@main/modules/sync'
import { sendEvent } from '../main' // 导入事件发送工具


// 选择模式监听器，用于处理用户选择的同步模式
let selectModeListenr: ((mode: LX.Sync.ModeTypes[keyof LX.Sync.ModeTypes] | null) => void) | null = null

/**
 * 初始化同步相关事件处理
 * 注册同步服务器和客户端操作的事件处理器
 */
export default () => {
  // 处理同步操作请求
  mainHandle<LX.Sync.SyncServiceActions, any>(WIN_MAIN_RENDERER_EVENT_NAME.sync_action, async({ params: data }) => {
    switch (data.action) {
      case 'enable_server': // 启用/禁用服务器
        data.data.enable ? await startServer(parseInt(data.data.port)) : await stopServer()
        return
      case 'enable_client': // 启用/禁用客户端
        data.data.enable ? await connectServer(data.data.host, data.data.authCode) : await disconnectServer()
        return
      case 'get_server_status': return getServerStatus() // 获取服务器状态
      case 'get_client_status': return getClientStatus() // 获取客户端状态
      case 'generate_code': return generateCode() // 生成授权码
      case 'select_mode': // 选择同步模式
        if (selectModeListenr) {
          selectModeListenr(data.data.mode)
          selectModeListenr = null
        }
        break
      default:
        break
    }
  })
  
  // 获取服务器设备列表
  mainHandle<never, LX.Sync.ServerDevices>(WIN_MAIN_RENDERER_EVENT_NAME.sync_get_server_devices, async() => {
    return getServerDevices()
  })
  
  // 移除服务器设备
  mainHandle<string>(WIN_MAIN_RENDERER_EVENT_NAME.sync_remove_server_device, async({ params: clientId }) => {
    await removeServerDevice(clientId)
  })
}


/**
 * 发送同步操作到渲染进程
 * @param data 同步操作数据
 */
export const sendSyncAction = (data: LX.Sync.SyncMainWindowActions) => {
  sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.sync_action, data)
}

/**
 * 发送客户端状态到渲染进程
 * @param status 客户端状态对象
 */
export const sendClientStatus = (status: LX.Sync.ClientStatus) => {
  sendSyncAction({
    action: 'client_status',
    data: status,
  })
}

/**
 * 发送服务器状态到渲染进程
 * @param status 服务器状态对象
 */
export const sendServerStatus = (status: LX.Sync.ServerStatus) => {
  sendSyncAction({
    action: 'server_status',
    data: status,
  })
}

/**
 * 发送选择模式请求到渲染进程
 * @param deviceName 设备名称
 * @param type 模式类型
 * @param listener 模式选择回调函数
 */
export const sendSelectMode = <T extends keyof LX.Sync.ModeTypes>(deviceName: string, type: T, listener: (mode: LX.Sync.ModeTypes[T] | null) => void) => {
  selectModeListenr = listener as typeof selectModeListenr
  sendSyncAction({ action: 'select_mode', data: { deviceName, type } })
}

/**
 * 移除选择模式监听器
 * 取消当前的模式选择操作
 */
export const removeSelectModeListener = () => {
  if (selectModeListenr) selectModeListenr(null)
  selectModeListenr = null
}

/**
 * 发送关闭选择模式请求到渲染进程
 * 关闭模式选择界面
 */
export const sendCloseSelectMode = () => {
  sendSyncAction({ action: 'close_select_mode' })
}
