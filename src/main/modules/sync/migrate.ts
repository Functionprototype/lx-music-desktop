// 导入同步相关的常量定义
import { File } from '../../../common/constants_sync'
// 导入文件系统模块
import fs from 'node:fs'
// 导入路径处理模块
import path from 'node:path'
// 导入文件存在性检查函数
import { exists } from './utils'

/**
 * 服务器端设备密钥信息接口
 * @interface ServerKeyInfo
 * @property {string} clientId 客户端ID
 * @property {string} key 密钥
 * @property {string} deviceName 设备名称
 * @property {number} [lastSyncDate] 最后同步时间
 * @property {string} [snapshotKey] 快照密钥
 * @property {number} [lastConnectDate] 最后连接时间
 * @property {boolean} isMobile 是否为移动设备
 */
/**
 * 服务器端设备密钥信息接口
 * @interface ServerKeyInfo
 * @description 定义了服务器端存储的设备信息结构
 * @property {string} clientId - 设备的唯一标识符
 * @property {string} key - 设备的加密密钥
 * @property {string} deviceName - 设备的显示名称
 * @property {number} [lastSyncDate] - 最后一次同步的时间戳
 * @property {string} [snapshotKey] - 设备的快照密钥
 * @property {number} [lastConnectDate] - 最后一次连接的时间戳
 * @property {boolean} isMobile - 标识是否为移动设备
 */
interface ServerKeyInfo {
  clientId: string
  key: string
  deviceName: string
  lastSyncDate?: number
  snapshotKey?: string
  lastConnectDate?: number
  isMobile: boolean
}


/**
 * 迁移 v2 版本的同步数据到新版本
 * 此函数负责将旧版本的同步数据结构转换为新版本的数据结构
 * 主要工作包括：
 * 1. 创建新的同步数据目录结构
 * 2. 转换服务器信息和设备信息
 * 3. 迁移快照数据
 * 4. 迁移认证密钥
 * 5. 清理旧数据文件
 * 
 * @param dataPath 数据目录路径
 */
/**
 * 数据迁移函数
 * @description 将v2版本的同步数据迁移到新版本
 * @param {string} dataPath - 数据存储的根目录路径
 * @returns {Promise<void>}
 */
export default async(dataPath: string) => {
  // 构建新版本同步数据目录路径
  const syncDataPath = path.join(dataPath, 'sync')
  // 如果新版本同步目录已存在，说明已经迁移过，直接返回
  if (await exists(syncDataPath)) return
  // 构建旧版本同步数据文件路径
  const oldInfoPath = path.join(dataPath, 'sync.json')
  // 如果旧版本同步数据文件不存在，无需迁移
  if (!await exists(oldInfoPath)) return
  // 构建服务端和客户端数据目录路径
  const serverSyncDataPath = path.join(dataPath, File.serverDataPath)
  const clientSyncDataPath = path.join(dataPath, File.clientDataPath)

  // 创建服务端和客户端数据目录
  await fs.promises.mkdir(serverSyncDataPath, { recursive: true })
  await fs.promises.mkdir(clientSyncDataPath, { recursive: true })
  // 读取并解析旧版本同步数据
  const info = JSON.parse((await fs.promises.readFile(oldInfoPath)).toString())


  // 构建新版本服务器信息、设备信息和列表目录的路径
  const serverInfoPath = path.join(serverSyncDataPath, File.serverInfoJSON)
  const devicesInfoPath = path.join(serverSyncDataPath, File.userDevicesJSON)
  const listDir = path.join(serverSyncDataPath, File.listDir)
  // 创建列表目录
  await fs.promises.mkdir(listDir)


  // 提取并重构快照信息
  const snapshotInfo = info.snapshotInfo
  delete info.snapshotInfo
  // 初始化客户端快照信息对象
  snapshotInfo.clients = {}
  // 遍历所有设备信息，重构快照数据结构
  for (const device of Object.values<ServerKeyInfo>(info.clients)) {
    // 将设备的快照信息迁移到新的数据结构
    snapshotInfo.clients[device.clientId] = {
      snapshotKey: device.snapshotKey,
      lastSyncDate: device.lastSyncDate,
    }
    // 更新设备的连接时间信息
    device.lastConnectDate = device.lastSyncDate
    // 移除旧的同步时间和快照密钥字段
    delete device.lastSyncDate
    delete device.snapshotKey
  }
  // 构建新的设备信息对象
  const devicesInfo = {
    userName: 'default',
    clients: info.clients,
  }
  // 保存服务器信息（包含服务器ID和版本号）
  await fs.promises.writeFile(serverInfoPath, JSON.stringify({ serverId: info.serverId, version: 2 }))
  // 保存设备信息
  await fs.promises.writeFile(devicesInfoPath, JSON.stringify(devicesInfo))
  // 保存快照信息
  await fs.promises.writeFile(path.join(listDir, File.listSnapshotInfoJSON), JSON.stringify(snapshotInfo))

  // 创建快照目录
  const snapshotPath = path.join(listDir, File.listSnapshotDir)
  await fs.promises.mkdir(snapshotPath)
  // 获取所有以'snapshot_'开头的快照文件
  const snapshots = (await fs.promises.readdir(dataPath)).filter(name => name.startsWith('snapshot_'))
  // 如果存在快照文件，将其迁移到新目录
  if (snapshots.length) {
    for (const file of snapshots) {
      await fs.promises.copyFile(path.join(dataPath, file), path.join(snapshotPath, file))
    }
  }


  // 保存同步认证密钥
  await fs.promises.writeFile(path.join(clientSyncDataPath, File.syncAuthKeysJSON), JSON.stringify(info.syncAuthKey))

  // 清理旧的快照文件
  for (const file of snapshots) {
    await fs.promises.unlink(path.join(dataPath, file))
  }
  // 删除旧的同步数据文件
  await fs.promises.unlink(oldInfoPath)
}

