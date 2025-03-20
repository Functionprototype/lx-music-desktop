import fs from 'node:fs'
import { checkPath, joinPath } from '@common/utils/nodejs'
import { log } from '@common/utils'
import { filterMusicList, toNewMusicInfo } from '@common/utils/tools'
import { APP_EVENT_NAMES, STORE_NAMES } from '@common/constants'

/**
 * 读取配置文件
 * 从旧版本的数据路径读取指定的配置文件
 * @param name 文件名
 * @returns 解析后的配置数据，如果文件不存在或解析失败则返回null
 */
export const parseDataFile = async<T>(name: string): Promise<T | null> => {
  // 拼接旧数据路径和文件名
  const path = joinPath(global.lxOldDataPath, name)
  // 检查文件是否存在
  if (await checkPath(path)) {
    try {
      // 读取文件内容并解析为JSON对象
      return JSON.parse((await fs.promises.readFile(path)).toString())
    } catch (err) {
      // 记录解析错误
      log.error(err)
    }
  }
  // 文件不存在或解析失败返回null
  return null
}

/**
 * 旧版用户列表信息接口定义
 * 用于类型转换和数据迁移
 */
interface OldUserListInfo {
  name: string                // 列表名称
  id: string                  // 列表ID
  source?: LX.OnlineSource    // 列表来源
  sourceListId?: string       // 源列表ID
  locationUpdateTime?: number // 位置更新时间
  list: any[]                 // 列表内容
}

/**
 * 迁移 v2.0.0 之前的 list data
 * 将旧版本的播放列表数据迁移到新版本
 * @returns 无返回值
 */
export const migrateDBData = async() => {
  // 读取旧版本的播放列表数据
  let playList = await parseDataFile<{ defaultList?: { list: any[] }, loveList?: { list: any[] }, tempList?: { list: any[] }, userList?: OldUserListInfo[] }>('playList.json')
  // 初始化新版本的列表数据结构
  let listDataAll: LX.List.ListDataFull = {
    defaultList: [],
    loveList: [],
    userList: [],
    tempList: [],
  }
  let isRequiredSave = false
  if (playList) {
    // 如果找到playList.json，则从中迁移数据
    // 处理默认列表数据
    if (playList.defaultList) listDataAll.defaultList = filterMusicList(playList.defaultList.list.map(m => toNewMusicInfo(m)))
    // 处理收藏列表数据
    if (playList.loveList) listDataAll.loveList = filterMusicList(playList.loveList.list.map(m => toNewMusicInfo(m)))
    // 处理临时列表数据
    if (playList.tempList) listDataAll.tempList = filterMusicList(playList.tempList.list.map(m => toNewMusicInfo(m)))
    // 处理用户自定义列表数据
    if (playList.userList) {
      listDataAll.userList = playList.userList.map(l => {
        return {
          ...l,
          locationUpdateTime: l.locationUpdateTime ?? null,
          list: filterMusicList(l.list.map(m => toNewMusicInfo(m))),
        }
      })
    }
    isRequiredSave = true
  } else {
    // 如果没有找到playList.json，则尝试从config.json中迁移数据
    const config = await parseDataFile<{ list?: { defaultList?: any[], loveList?: any[] } }>('config.json')
    if (config?.list) {
      const list = config.list
      // 处理默认列表数据
      if (list.defaultList) listDataAll.defaultList = filterMusicList(list.defaultList.map(m => toNewMusicInfo(m)))
      // 处理收藏列表数据
      if (list.loveList) listDataAll.loveList = filterMusicList(list.loveList.map(m => toNewMusicInfo(m)))
      isRequiredSave = true
    }
  }
  // 如果有数据需要保存，则覆盖写入新的数据库
  if (isRequiredSave) await global.lx.worker.dbService.listDataOverwrite(listDataAll)

  // 迁移编辑过的歌词数据
  const lyricData = await parseDataFile<Record<string, LX.Music.LyricInfo>>('lyrics_edited.json')
  if (lyricData) {
    // 遍历所有编辑过的歌词，逐个添加到新数据库
    for await (const [id, info] of Object.entries(lyricData)) {
      await global.lx.worker.dbService.editedLyricAdd(id, info)
    }
  }
}

/**
 * 迁移文件
 * 将旧版本的文件复制到新版本的路径
 * @param name 源文件名
 * @param targetName 目标文件名
 */
const migrateFile = async(name: string, targetName: string) => {
  // 构建新路径和旧路径
  let path = joinPath(global.lxDataPath, targetName)
  let oldPath = joinPath(global.lxOldDataPath, name)
  // 如果新路径不存在且旧路径存在，则复制文件
  if (!await checkPath(path) && await checkPath(oldPath)) {
    await fs.promises.copyFile(oldPath, path).catch(err => {
      log.error(err)
    }).catch(err => {
      // 二次捕获错误，确保不会中断迁移流程
      log.error(err)
    })
  }
}

/**
 * 迁移 v2.0.0 之前的 data.json
 * 将旧版本的应用数据迁移到新版本
 * @returns 无返回值
 */
export const migrateDataJson = async() => {
  // 构建新版本data.json的路径
  const path = joinPath(global.lxDataPath, 'data.json')
  // 如果新版本文件已存在，则不需要迁移
  if (await checkPath(path)) return
  // 读取旧版本的data.json文件
  const oldDataFile = await parseDataFile<{
    searchHistoryList?: string[]  // 搜索历史列表
    playInfo?: any                // 播放信息
    listPrevSelectId?: any        // 上一次选择的列表ID
    listPosition?: any            // 列表位置信息
    listUpdateInfo?: any          // 列表更新信息
  }>('data.json')
  // 如果旧文件不存在，则不需要迁移
  if (!oldDataFile) return
  // 创建新的数据对象
  const newData: any = {}
  // 迁移搜索历史列表
  if (oldDataFile.searchHistoryList) newData.searchHistoryList = oldDataFile.searchHistoryList
  // 迁移播放信息
  if (oldDataFile.playInfo) newData.playInfo = oldDataFile.playInfo
  // 迁移上一次选择的列表ID
  if (oldDataFile.listPrevSelectId) newData.listPrevSelectId = oldDataFile.listPrevSelectId
  // 迁移列表位置信息，并重命名为listScrollPosition
  if (oldDataFile.listPosition) newData.listScrollPosition = oldDataFile.listPosition
  // 迁移列表更新信息
  if (oldDataFile.listUpdateInfo) newData.listUpdateInfo = oldDataFile.listUpdateInfo

  // 将新数据写入文件
  await fs.promises.writeFile(path, JSON.stringify(newData)).catch(err => {
    log.error(err)
  })
}


/**
 * 热键类型名称映射
 * 将旧版本的热键类型名称映射到新版本
 */
const hotKeyNameMap = {
  mainWindow: APP_EVENT_NAMES.winMainName,  // 主窗口热键类型映射
  winLyric: APP_EVENT_NAMES.winLyricName,   // 歌词窗口热键类型映射
} as const

/**
 * 更新热键类型名称
 * 将配置中的热键类型名称更新为新版本的名称
 * @param config 热键配置对象
 */
const updateHotKeyTypeName = (config: LX.HotKeyConfig) => {
  // 遍历所有热键配置
  for (const keyConfig of Object.values(config.keys)) {
    // 如果热键类型在映射表中存在，则更新为新的类型名称
    if (hotKeyNameMap[keyConfig.type as keyof typeof hotKeyNameMap]) keyConfig.type = hotKeyNameMap[keyConfig.type as keyof typeof hotKeyNameMap]
  }
}

/**
 * 迁移 v2.0.0 之前的 hotkey
 * 将旧版本的热键配置迁移到新版本
 * @returns 迁移后的热键配置，如果旧配置不存在则返回null
 */
export const migrateHotKey = async() => {
  // 读取旧版本的热键配置
  const oldConfig = await parseDataFile<LX.HotKeyConfigAll>('hotKey.json')
  if (oldConfig) {
    let localConfig: LX.HotKeyConfig
    let globalConfig: LX.HotKeyConfig
    // 更新本地和全局热键的类型名称
    updateHotKeyTypeName(oldConfig.local)
    updateHotKeyTypeName(oldConfig.global)

    localConfig = oldConfig.local
    globalConfig = oldConfig.global

    // 移除v1.0.1及之前设置的全局声音媒体快捷键接管
    if (globalConfig.keys.VolumeUp) {
      delete globalConfig.keys.VolumeUp
      delete globalConfig.keys.VolumeDown
      delete globalConfig.keys.VolumeMute
    }
    // 返回迁移后的热键配置
    return {
      local: localConfig,
      global: globalConfig,
    }
  }
  return null
}

/**
 * 迁移 v2.0.0 之前的user api
 * 将旧版本的用户API配置迁移到新版本
 * @returns 无明确返回值，内部调用migrateFile完成文件迁移
 */
export const migrateUserApi = async() => migrateFile('userApi.json', STORE_NAMES.USER_API + '.json')
