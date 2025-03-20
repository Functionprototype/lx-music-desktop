/**
 * 同步功能处理器模块
 * 负责处理客户端的同步功能变更请求
 * 注意：所有导出的方法将暴露给客户端调用，第一个参数固定为当前socket对象
 */

import { FeaturesList } from '../../../../../../common/constants_sync'
import { modules } from '../../modules'

/**
 * 服务器同步处理器对象
 * 包含处理客户端同步功能变更的方法
 */
const handler: LX.Sync.ServerSyncHandlerActions<LX.Sync.Server.Socket> = {
  /**
   * 处理客户端同步功能变更
   * @param socket 当前WebSocket连接对象
   * @param feature 客户端请求变更的功能状态
   */
  async onFeatureChanged(socket, feature) {
    // const userSpace = getUserSpace(socket.userInfo.name)
    const beforeFeature = socket.feature

    // 遍历所有支持的功能
    for (const name of FeaturesList) {
      const newStatus = feature[name]
      if (newStatus == null) continue

      // 更新功能状态
      beforeFeature[name] = feature[name]
      socket.moduleReadys[name] = false

      // 如果功能被启用，执行相应模块的同步
      if (feature[name]) await modules[name].sync(socket).catch(_ => _)
    }
  },
}

export default handler
