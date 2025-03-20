/**
 * 客户端同步处理模块
 * 该模块负责处理服务端对客户端的同步请求
 * 所有导出的方法都将暴露给服务端调用，第一个参数固定为当前socket对象
 */

// import { getUserSpace } from '@/user'
// import { modules } from '../modules'

import { featureVersion } from '../modules'

/**
 * 客户端同步处理器
 * 实现了除finished之外的所有ClientSyncHandlerActions接口方法
 */
const handler: Omit<LX.Sync.ClientSyncHandlerActions<LX.Sync.Client.Socket>, 'finished'> = {
  /**
   * 获取客户端启用的功能列表
   * @param socket - 当前的Socket连接实例
   * @param serverType - 服务器类型，可能是'server'或'desktop-app'
   * @param supportedFeatures - 服务端支持的功能列表
   * @returns 返回启用的功能配置对象
   */
  async getEnabledFeatures(socket, serverType, supportedFeatures) {
    // const userSpace = getUserSpace(socket.userInfo.name)
    const features: LX.Sync.EnabledFeatures = {}

    // 根据服务器类型和版本兼容性决定启用的功能
    switch (serverType) {
      case 'server':
        // 检查列表同步功能版本是否兼容
        if (featureVersion.list == supportedFeatures.list) {
          features.list = { skipSnapshot: false }
        }
        // 检查不喜欢列表同步功能版本是否兼容
        if (featureVersion.dislike == supportedFeatures.dislike) {
          features.dislike = { skipSnapshot: false }
        }
        return features
      case 'desktop-app':
      default:
        // 桌面应用的功能启用逻辑与服务器相同
        if (featureVersion.list == supportedFeatures.list) {
          features.list = { skipSnapshot: false }
        }
        if (featureVersion.dislike == supportedFeatures.dislike) {
          features.dislike = { skipSnapshot: false }
        }
        return features
    }
  },
}

export default handler
