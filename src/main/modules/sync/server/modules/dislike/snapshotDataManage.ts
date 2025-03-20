// 导入必要的依赖和工具函数
import { throttle } from '@common/utils/common'
import fs from 'node:fs'
import path from 'node:path'
import syncLog from '../../../log'
import { getUserConfig, type UserDataManage } from '../../user/data'
import { File } from '../../../../../../common/constants_sync'
import { checkAndCreateDirSync } from '../../utils'


// 快照信息接口定义
interface SnapshotInfo {
  latest: string | null      // 最新快照的标识符
  time: number              // 快照时间戳
  list: string[]            // 快照列表
  clients: Record<string, LX.Sync.Dislike.ListInfo>  // 客户端快照信息映射表
}
/**
 * 不喜欢列表快照数据管理类
 * 负责管理用户不喜欢列表的快照数据，包括快照的创建、存储、读取和同步等功能
 */
export class SnapshotDataManage {
  userDataManage: UserDataManage               // 用户数据管理器实例
  dislikeDir: string                           // 不喜欢列表数据目录路径
  snapshotDir: string                          // 快照存储目录路径
  snapshotInfoFilePath: string                 // 快照信息文件路径
  snapshotInfo: SnapshotInfo                   // 当前快照信息
  clientSnapshotKeys: string[]                 // 客户端快照键列表
  private readonly saveSnapshotInfoThrottle: () => void  // 节流保存快照信息的函数

  /**
   * 检查指定的快照键是否属于某个设备
   * @param key 快照键
   * @returns 是否包含该设备的快照
   */
  isIncluedsDevice = (key: string) => {
    return this.clientSnapshotKeys.includes(key)
  }

  /**
   * 清理旧的快照数据
   * 当快照数量超过用户配置的最大值时，删除最旧的快照
   */
  clearOldSnapshot = async() => {
    if (!this.snapshotInfo) return
    const snapshotList = this.snapshotInfo.list.filter(key => !this.isIncluedsDevice(key))
    // console.log(snapshotList.length, lx.config.maxSnapshotNum)
    const userMaxSnapshotNum = getUserConfig(this.userDataManage.userName).maxSnapshotNum
    let requiredSave = snapshotList.length > userMaxSnapshotNum
    while (snapshotList.length > userMaxSnapshotNum) {
      const name = snapshotList.pop()
      if (name) {
        await this.removeSnapshot(name)
        this.snapshotInfo.list.splice(this.snapshotInfo.list.indexOf(name), 1)
      } else break
    }
    if (requiredSave) this.saveSnapshotInfo(this.snapshotInfo)
  }

  /**
   * 更新设备的快照键
   * @param clientId 客户端ID
   * @param key 新的快照键
   */
  updateDeviceSnapshotKey = async(clientId: string, key: string) => {
    // console.log('updateDeviceSnapshotKey', key)
    let client = this.snapshotInfo.clients[clientId]
    if (!client) client = this.snapshotInfo.clients[clientId] = { snapshotKey: '', lastSyncDate: 0 }
    if (client.snapshotKey) this.clientSnapshotKeys.splice(this.clientSnapshotKeys.indexOf(client.snapshotKey), 1)
    client.snapshotKey = key
    client.lastSyncDate = Date.now()
    this.clientSnapshotKeys.push(key)
    this.saveSnapshotInfoThrottle()
  }

  /**
   * 获取设备当前的快照键
   * @param clientId 客户端ID
   * @returns 当前快照键
   */
  getDeviceCurrentSnapshotKey = async(clientId: string) => {
    // console.log('updateDeviceSnapshotKey', key)
    const client = this.snapshotInfo.clients[clientId]
    return client?.snapshotKey
  }

  /**
   * 获取快照信息
   * @returns 当前的快照信息对象
   */
  getSnapshotInfo = async(): Promise<SnapshotInfo> => {
    return this.snapshotInfo
  }

  /**
   * 保存快照信息
   * @param info 要保存的快照信息
   */
  saveSnapshotInfo = (info: SnapshotInfo) => {
    this.snapshotInfo = info
    this.saveSnapshotInfoThrottle()
  }

  /**
   * 移除指定客户端的快照信息
   * @param clientId 要移除的客户端ID
   */
  removeSnapshotInfo = (clientId: string) => {
    let client = this.snapshotInfo.clients[clientId]
    if (!client) return
    if (client.snapshotKey) this.clientSnapshotKeys.splice(this.clientSnapshotKeys.indexOf(client.snapshotKey), 1)
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.snapshotInfo.clients[clientId]
    this.saveSnapshotInfoThrottle()
  }

  /**
   * 获取指定名称的快照数据
   * @param name 快照名称
   * @returns 快照数据，如果读取失败则返回null
   */
  getSnapshot = async(name: string) => {
    const filePath = path.join(this.snapshotDir, `snapshot_${name}`)
    let listData: LX.Dislike.DislikeRules
    try {
      listData = (await fs.promises.readFile(filePath)).toString('utf-8')
    } catch (err) {
      syncLog.warn(err)
      return null
    }
    return listData
  }

  /**
   * 保存快照数据
   * @param name 快照名称
   * @param data 要保存的快照数据
   * @throws 如果保存失败则抛出错误
   */
  saveSnapshot = async(name: string, data: string) => {
    syncLog.info('saveSnapshot', this.userDataManage.userName, name)
    const filePath = path.join(this.snapshotDir, `snapshot_${name}`)
    try {
      fs.writeFileSync(filePath, data)
    } catch (err) {
      syncLog.error(err)
      throw err
    }
  }

  /**
   * 删除指定的快照文件
   * @param name 要删除的快照名称
   */
  removeSnapshot = async(name: string) => {
    syncLog.info('removeSnapshot', this.userDataManage.userName, name)
    const filePath = path.join(this.snapshotDir, `snapshot_${name}`)
    try {
      fs.unlinkSync(filePath)
    } catch (err) {
      syncLog.error(err)
    }
  }


  /**
   * 构造函数
   * @param userDataManage 用户数据管理器实例
   */
  constructor(userDataManage: UserDataManage) {
    this.userDataManage = userDataManage

    this.dislikeDir = path.join(userDataManage.userDir, File.dislikeDir)
    checkAndCreateDirSync(this.dislikeDir)

    this.snapshotDir = path.join(this.dislikeDir, File.dislikeSnapshotDir)
    checkAndCreateDirSync(this.snapshotDir)

    this.snapshotInfoFilePath = path.join(this.dislikeDir, File.dislikeSnapshotInfoJSON)
    this.snapshotInfo = fs.existsSync(this.snapshotInfoFilePath)
      ? JSON.parse(fs.readFileSync(this.snapshotInfoFilePath).toString())
      : { latest: null, time: 0, list: [], clients: {} }

    this.saveSnapshotInfoThrottle = throttle(() => {
      fs.writeFile(this.snapshotInfoFilePath, JSON.stringify(this.snapshotInfo), 'utf8', (err) => {
        if (err) console.error(err)
        void this.clearOldSnapshot()
      })
    })

    this.clientSnapshotKeys = Object.values(this.snapshotInfo.clients).map(device => device.snapshotKey).filter(k => k)
  }
}
// type UserDataManages = Map<string, UserDataManage>

// export const createUserDataManage = (user: LX.UserConfig) => {
//   const manage = Object.create(userDataManage) as typeof userDataManage
//   manage.userDir = user.dataPath
// }
