import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { throttle } from '@common/utils/common'
import { filterFileName, toMD5 } from '../utils'
import { File } from '@common/constants_sync'
import { exists } from '../../utils'


/**
 * 服务器信息接口，用于存储服务器的基本配置
 */
interface ServerInfo {
  /** 服务器唯一标识符 */
  serverId: string
  /** 服务器版本号 */
  version: number
}

/**
 * 设备信息接口，用于管理用户的设备连接信息
 */
interface DevicesInfo {
  /** 用户名 */
  userName: string
  /** 客户端信息映射表，key为clientId */
  clients: Record<string, LX.Sync.ServerKeyInfo>
}
/**
 * 节流保存服务器信息的函数
 */
const saveServerInfoThrottle = throttle(() => {
  fs.writeFile(path.join(global.lxDataPath, File.serverDataPath, File.serverInfoJSON), JSON.stringify(serverInfo), (err) => {
    if (err) console.error(err)
  })
})
let serverInfo: ServerInfo
/**
 * 初始化服务器信息
 * 如果服务器信息文件存在则读取，否则创建新的服务器信息
 */
export const initServerInfo = async() => {
  if (serverInfo != null) return
  const serverInfoFilePath = path.join(global.lxDataPath, File.serverDataPath, File.serverInfoJSON)
  if (await exists(serverInfoFilePath)) {
    // eslint-disable-next-line require-atomic-updates
    serverInfo = JSON.parse((await fs.promises.readFile(serverInfoFilePath)).toString())
  } else {
    // eslint-disable-next-line require-atomic-updates
    serverInfo = {
      serverId: randomBytes(4 * 4).toString('base64'),
      version: 2,
    }
    const syncDataPath = path.join(global.lxDataPath, File.serverDataPath)
    if (!await exists(syncDataPath)) {
      await fs.promises.mkdir(syncDataPath, { recursive: true })
    }
    saveServerInfoThrottle()
  }
}
/**
 * 获取服务器ID
 * @returns 服务器唯一标识符
 */
export const getServerId = () => {
  return serverInfo.serverId
}
/**
 * 获取服务器版本号
 * @returns 服务器当前版本号，默认为1
 */
export const getVersion = async() => {
  await initServerInfo()
  return serverInfo.version ?? 1
}
/**
 * 设置服务器版本号
 * @param version 要设置的版本号
 */
export const setVersion = async(version: number) => {
  await initServerInfo()
  serverInfo.version = version
  saveServerInfoThrottle()
}

/**
 * 根据用户名生成用户目录名
 * @param userName 用户名
 * @returns 过滤后的用户目录名（用户名_MD5前6位）
 */
export const getUserDirname = (userName: string) => `${filterFileName(userName)}_${toMD5(userName).substring(0, 6)}`

/**
 * 获取用户配置信息
 * @param userName 用户名
 * @returns 用户配置对象，包含最大快照数和音乐添加位置类型
 */
export const getUserConfig = (userName: string) => {
  return {
    maxSnapshotNum: global.lx.appSetting['sync.server.maxSsnapshotNum'],
    'list.addMusicLocationType': global.lx.appSetting['list.addMusicLocationType'],
  }
}


// 读取所有用户目录下的devicesInfo信息，建立clientId与用户的对应关系，用于非首次连接
// let deviceUserMap: Map<string, string> = new Map<string, string>()
// const init
// for (const deviceInfo of fs.readdirSync(syncDataPath).map(dirname => {
//   const devicesFilePath = path.join(syncDataPath, dirname, File.userDevicesJSON)
//   if (fs.existsSync(devicesFilePath)) {
//     const devicesInfo = JSON.parse(fs.readFileSync(devicesFilePath).toString()) as DevicesInfo
//     if (getUserDirname(devicesInfo.userName) == dirname) return { userName: devicesInfo.userName, devices: devicesInfo.clients }
//   }
//   return { userName: '', devices: {} }
// })) {
//   for (const device of Object.values(deviceInfo.devices)) {
//     if (deviceInfo.userName) deviceUserMap.set(device.clientId, deviceInfo.userName)
//   }
// }
// export const getUserName = (clientId: string): string | null => {
//   if (!clientId) return null
//   return deviceUserMap.get(clientId) ?? null
// }
// export const setUserName = (clientId: string, dir: string) => {
//   deviceUserMap.set(clientId, dir)
// }
// export const deleteUserName = (clientId: string) => {
//   deviceUserMap.delete(clientId)
// }

/**
 * 创建客户端密钥信息
 * @param deviceName 设备名称
 * @param isMobile 是否为移动设备
 * @returns 新的客户端密钥信息对象
 */
export const createClientKeyInfo = (deviceName: string, isMobile: boolean): LX.Sync.ServerKeyInfo => {
  const keyInfo: LX.Sync.ServerKeyInfo = {
    clientId: randomBytes(4 * 4).toString('base64'),
    key: randomBytes(16).toString('base64'),
    deviceName,
    isMobile,
    lastConnectDate: 0,
  }
  return keyInfo
}

/**
 * 用户数据管理类
 * 负责管理单个用户的设备连接信息和数据同步
 */
export class UserDataManage {
  userName: string
  userDir: string
  devicesFilePath: string
  devicesInfo: DevicesInfo
  private readonly saveDevicesInfoThrottle: () => void

  /**
   * 获取所有客户端密钥信息
   * @returns 按最后连接时间排序的客户端密钥信息数组
   */
  getAllClientKeyInfo = () => {
    return Object.values(this.devicesInfo.clients).sort((a, b) => (b.lastConnectDate ?? 0) - (a.lastConnectDate ?? 0))
  }

  /**
   * 保存客户端密钥信息
   * @param keyInfo 客户端密钥信息对象
   * @throws 当客户端数量超过101时抛出错误
   */
  saveClientKeyInfo = (keyInfo: LX.Sync.ServerKeyInfo) => {
    if (this.devicesInfo.clients[keyInfo.clientId] == null && Object.keys(this.devicesInfo.clients).length > 101) throw new Error('max keys')
    this.devicesInfo.clients[keyInfo.clientId] = keyInfo
    this.saveDevicesInfoThrottle()
  }

  /**
   * 获取指定客户端的密钥信息
   * @param clientId 客户端ID
   * @returns 客户端密钥信息对象，不存在则返回null
   */
  getClientKeyInfo = (clientId?: string | null): LX.Sync.ServerKeyInfo | null => {
    if (!clientId) return null
    return this.devicesInfo.clients[clientId] ?? null
  }

  /**
   * 移除指定客户端的密钥信息
   * @param clientId 要移除的客户端ID
   */
  removeClientKeyInfo = async(clientId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.devicesInfo.clients[clientId]
    this.saveDevicesInfoThrottle()
  }

  /**
   * 检查是否包含指定客户端
   * @param clientId 客户端ID
   * @returns 是否存在该客户端
   */
  isIncluedsClient = (clientId: string) => {
    return Object.values(this.devicesInfo.clients).some(client => client.clientId == clientId)
  }

  constructor(userName: string) {
    this.userName = userName
    const syncDataPath = path.join(global.lxDataPath, File.serverDataPath)
    this.userDir = syncDataPath
    this.devicesFilePath = path.join(this.userDir, File.userDevicesJSON)
    this.devicesInfo = fs.existsSync(this.devicesFilePath) ? JSON.parse(fs.readFileSync(this.devicesFilePath).toString()) : { userName, clients: {} }

    this.saveDevicesInfoThrottle = throttle(() => {
      fs.writeFile(this.devicesFilePath, JSON.stringify(this.devicesInfo), 'utf8', (err) => {
        if (err) console.error(err)
      })
    })
  }
}
// type UserDataManages = Map<string, UserDataManage>

// export const createUserDataManage = (user: LX.UserConfig) => {
//   const manage = Object.create(userDataManage) as typeof userDataManage
//   manage.userDir = user.dataPath
// }
