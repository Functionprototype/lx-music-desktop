/**
 * 同步核心功能模块
 * 负责处理客户端连接后的功能同步初始化
 */

// 导入功能列表和版本信息
import { FeaturesList } from '../../../../../../common/constants_sync'
import { featureVersion, modules } from '../../modules'

/**
 * 执行同步初始化
 * @param socket 当前WebSocket连接对象
 * @throws {Error} 当连接断开时抛出异常
 */
export const sync = async(socket: LX.Sync.Server.Socket) => {
  // 连接状态标记
  let disconnected = false
  socket.onClose(() => {
    disconnected = true
  })

  // 获取客户端启用的功能列表
  const enabledFeatures = await socket.remote.getEnabledFeatures('desktop-app', featureVersion)

  // 如果连接已断开，终止同步
  if (disconnected) throw new Error('disconnected')

  // 遍历所有支持的功能模块
  for (const moduleName of FeaturesList) {
    // 如果客户端启用了该功能，执行同步
    if (enabledFeatures[moduleName]) {
      socket.feature[moduleName] = enabledFeatures[moduleName]
      await modules[moduleName].sync(socket).catch(_ => _)
    }
    // 每个模块同步后检查连接状态
    if (disconnected) throw new Error('disconnected')
  }

  // 通知客户端同步完成
  await socket.remote.finished()
}
