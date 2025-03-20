// 导入所需的依赖模块
import fs from 'node:fs'
import path from 'node:path'
import { File } from '../../../../common/constants_sync'
import { exists } from '../utils'

// 存储同步认证密钥的对象
let syncAuthKeys: Record<string, LX.Sync.ClientKeyInfo>

// 保存同步认证密钥到文件
const saveSyncAuthKeys = async() => {
  const syncAuthKeysFilePath = path.join(global.lxDataPath, File.clientDataPath, File.syncAuthKeysJSON)
  return fs.promises.writeFile(syncAuthKeysFilePath, JSON.stringify(syncAuthKeys), 'utf8')
}

// 初始化客户端信息
export const initClientInfo = async() => {
  // 如果已经初始化过，直接返回
  if (syncAuthKeys != null) return
  
  // 构建同步认证密钥文件路径
  const syncAuthKeysFilePath = path.join(global.lxDataPath, File.clientDataPath, File.syncAuthKeysJSON)
  
  // 检查文件是否存在并读取内容
  if (await fs.promises.stat(syncAuthKeysFilePath).then(() => true).catch(() => false)) {
    syncAuthKeys = JSON.parse((await fs.promises.readFile(syncAuthKeysFilePath)).toString())
  } else {
    // 如果文件不存在，创建空对象并初始化目录
    syncAuthKeys = {}
    const syncDataPath = path.join(global.lxDataPath, File.clientDataPath)
    if (!await exists(syncDataPath)) {
      await fs.promises.mkdir(syncDataPath, { recursive: true })
    }
    void saveSyncAuthKeys()
  }
}

// 获取指定服务器的同步认证密钥
export const getSyncAuthKey = async(serverId: string) => {
  await initClientInfo()
  return syncAuthKeys[serverId] ?? null
}

// 设置指定服务器的同步认证密钥
export const setSyncAuthKey = async(serverId: string, info: LX.Sync.ClientKeyInfo) => {
  await initClientInfo()
  syncAuthKeys[serverId] = info
  void saveSyncAuthKeys()
}

// 注释掉的同步主机相关代码
// let syncHost: string
// export const getSyncHost = async() => {
//   if (syncHost === undefined) {
//     const store = getStore(STORE_NAMES.SYNC)
//     syncHost = (store.get('syncHost') as typeof syncHost | null) ?? ''
//   }
//   return syncHost
// }
// export const setSyncHost = async(host: string) => {
//   syncHost = host
//   const store = getStore(STORE_NAMES.SYNC)
//   store.set('syncHost', syncHost)
// }
// let syncHostHistory: string[]
// export const getSyncHostHistory = async() => {
//   if (syncHostHistory === undefined) {
//     const store = getStore(STORE_NAMES.SYNC)
//     syncHostHistory = (store.get('syncHostHistory') as string[]) ?? []
//   }
//   return syncHostHistory
// }
// export const addSyncHostHistory = async(host: string) => {
//   let syncHostHistory = await getSyncHostHistory()
//   if (syncHostHistory.some(h => h == host)) return
//   syncHostHistory.unshift(host)
//   if (syncHostHistory.length > 20) syncHostHistory = syncHostHistory.slice(0, 20)
//   const store = getStore(STORE_NAMES.SYNC)
//   store.set('syncHostHistory', syncHostHistory)
// }
// export const removeSyncHostHistory = async(index: number) => {
//   syncHostHistory.splice(index, 1)
//   const store = getStore(STORE_NAMES.SYNC)
//   store.set('syncHostHistory', syncHostHistory)
// }
