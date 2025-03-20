import { type UserDataManage } from '../../user'
import { SnapshotDataManage } from './snapshotDataManage'
import { toMD5 } from '../../utils'
import { getLocalDislikeData } from '@main/modules/sync/dislikeEvent'

/**
 * 不喜欢列表管理类
 * 负责管理不喜欢列表数据的快照，包括创建、获取和更新快照等功能
 */
export class DislikeManage {
  snapshotDataManage: SnapshotDataManage

  /**
   * 构造函数
   * @param userDataManage 用户数据管理实例
   */
  constructor(userDataManage: UserDataManage) {
    this.snapshotDataManage = new SnapshotDataManage(userDataManage)
  }

  /**
   * 创建不喜欢列表数据快照
   * 将当前不喜欢列表数据转换为字符串并计算MD5
   * 如果MD5与最新快照相同则直接返回
   * 否则保存新快照并更新快照信息
   */
  createSnapshot = async() => {
    const listData = await this.getDislikeRules()
    const md5 = toMD5(listData.trim())
    const snapshotInfo = await this.snapshotDataManage.getSnapshotInfo()
    console.log(md5, snapshotInfo.latest)
    if (snapshotInfo.latest == md5) return md5
    if (snapshotInfo.list.includes(md5)) {
      snapshotInfo.list.splice(snapshotInfo.list.indexOf(md5), 1)
    } else await this.snapshotDataManage.saveSnapshot(md5, listData)
    if (snapshotInfo.latest) snapshotInfo.list.unshift(snapshotInfo.latest)
    snapshotInfo.latest = md5
    snapshotInfo.time = Date.now()
    this.snapshotDataManage.saveSnapshotInfo(snapshotInfo)
    return md5
  }

  /**
   * 获取当前不喜欢列表信息的键值
   * 通过创建快照来获取最新的列表信息键值
   */
  getCurrentListInfoKey = async() => {
    return this.createSnapshot()
  }

  /**
   * 获取指定设备的当前快照键值
   * @param clientId 设备ID
   */
  getDeviceCurrentSnapshotKey = async(clientId: string) => {
    return this.snapshotDataManage.getDeviceCurrentSnapshotKey(clientId)
  }

  /**
   * 更新指定设备的快照键值
   * @param clientId 设备ID
   * @param key 新的快照键值
   */
  updateDeviceSnapshotKey = async(clientId: string, key: string) => {
    await this.snapshotDataManage.updateDeviceSnapshotKey(clientId, key)
  }

  /**
   * 移除指定设备的快照信息
   * @param clientId 设备ID
   */
  removeDevice = async(clientId: string) => {
    this.snapshotDataManage.removeSnapshotInfo(clientId)
  }

  /**
   * 获取不喜欢列表规则
   * 从本地获取最新的不喜欢列表数据
   */
  getDislikeRules = async() => {
    return getLocalDislikeData()
  }
}

