import { LIST_IDS } from '@common/constants'

/**
 * 构建列表信息对象，用于统一字段位置顺序
 * @param param0 列表信息参数对象
 * @param param0.id 列表ID
 * @param param0.name 列表名称
 * @param param0.source 列表来源
 * @param param0.sourceListId 源列表ID
 * @param param0.list 列表内容
 * @param param0.locationUpdateTime 位置更新时间
 * @returns 标准化的列表信息对象
 */
export const buildUserListInfoFull = ({ id, name, source, sourceListId, list, locationUpdateTime }: LX.List.UserListInfoFull) => {
  return {
    id,
    name,
    source,
    sourceListId,
    locationUpdateTime,
    list,
  }
}

/**
 * 获取本地列表数据，包括默认列表、收藏列表和用户自定义列表
 * @returns 返回包含所有列表数据的对象
 */
export const getLocalListData = async(): Promise<LX.Sync.List.ListData> => {
  const lists: LX.Sync.List.ListData = {
    defaultList: await global.lx.worker.dbService.getListMusics(LIST_IDS.DEFAULT),
    loveList: await global.lx.worker.dbService.getListMusics(LIST_IDS.LOVE),
    userList: [],
  }

  const userListInfos = await global.lx.worker.dbService.getAllUserList()
  for await (const list of userListInfos) {
    lists.userList.push(await global.lx.worker.dbService.getListMusics(list.id)
      .then(musics => buildUserListInfoFull({ ...list, list: musics })))
  }

  return lists
}

/**
 * 设置本地列表数据
 * @param listData 要设置的列表数据
 */
export const setLocalListData = async(listData: LX.Sync.List.ListData) => {
  await global.lx.event_list.list_data_overwrite(listData, true)
}


/**
 * 注册列表动作事件
 * 用于处理本地列表变更时向远端同步数据
 * @param sendListAction 发送列表动作的回调函数
 * @returns 返回取消注册事件的函数
 */
export const registerListActionEvent = (sendListAction: (action: LX.Sync.List.ActionList) => (void | Promise<void>)) => {
  /**
   * 处理列表数据覆写事件
   * @param {MakeOptional<LX.List.ListDataFull, 'tempList'>} listData - 要覆写的列表数据
   * @param {boolean} isRemote - 是否为远程操作，默认为false
   */
  const list_data_overwrite = async(listData: MakeOptional<LX.List.ListDataFull, 'tempList'>, isRemote: boolean = false) => {
    if (isRemote) return
    await sendListAction({ action: 'list_data_overwrite', data: listData })
  }

  /**
   * 处理创建列表事件
   * @param {number} position - 列表插入位置
   * @param {LX.List.UserListInfo[]} listInfos - 要创建的列表信息数组
   * @param {boolean} isRemote - 是否为远程操作，默认为false
   */
  const list_create = async(position: number, listInfos: LX.List.UserListInfo[], isRemote: boolean = false) => {
    if (isRemote) return
    await sendListAction({ action: 'list_create', data: { position, listInfos } })
  }

  /**
   * 处理删除列表事件
   * @param {string[]} ids - 要删除的列表ID数组
   * @param {boolean} isRemote - 是否为远程操作，默认为false
   */
  const list_remove = async(ids: string[], isRemote: boolean = false) => {
    if (isRemote) return
    await sendListAction({ action: 'list_remove', data: ids })
  }

  /**
   * 处理更新列表信息事件
   * @param {LX.List.UserListInfo[]} lists - 要更新的列表信息数组
   * @param {boolean} isRemote - 是否为远程操作，默认为false
   */
  const list_update = async(lists: LX.List.UserListInfo[], isRemote: boolean = false) => {
    if (isRemote) return
    await sendListAction({ action: 'list_update', data: lists })
  }

  /**
   * 处理更新列表位置事件
   * @param {number} position - 新的位置
   * @param {string[]} ids - 要更新位置的列表ID数组
   * @param {boolean} isRemote - 是否为远程操作，默认为false
   */
  const list_update_position = async(position: number, ids: string[], isRemote: boolean = false) => {
    if (isRemote) return
    await sendListAction({ action: 'list_update_position', data: { position, ids } })
  }
  /**
   * 处理覆写列表音乐事件
   * @param {string} listId - 列表ID
   * @param {LX.Music.MusicInfo[]} musicInfos - 要覆写的音乐信息数组
   * @param {boolean} isRemote - 是否为远程操作，默认为false
   */
  const list_music_overwrite = async(listId: string, musicInfos: LX.Music.MusicInfo[], isRemote: boolean = false) => {
    // 如果是远程操作或临时列表，则不处理
    if (isRemote || listId == LIST_IDS.TEMP) return
    await sendListAction({ action: 'list_music_overwrite', data: { listId, musicInfos } })
  }

  /**
   * 处理添加音乐到列表事件
   * @param {string} id - 列表ID
   * @param {LX.Music.MusicInfo[]} musicInfos - 要添加的音乐信息数组
   * @param {LX.AddMusicLocationType} addMusicLocationType - 添加音乐的位置类型
   * @param {boolean} isRemote - 是否为远程操作，默认为false
   */
  const list_music_add = async(id: string, musicInfos: LX.Music.MusicInfo[], addMusicLocationType: LX.AddMusicLocationType, isRemote: boolean = false) => {
    if (isRemote) return
    await sendListAction({ action: 'list_music_add', data: { id, musicInfos, addMusicLocationType } })
  }

  /**
   * 处理移动音乐事件
   * @param {string} fromId - 源列表ID
   * @param {string} toId - 目标列表ID
   * @param {LX.Music.MusicInfo[]} musicInfos - 要移动的音乐信息数组
   * @param {LX.AddMusicLocationType} addMusicLocationType - 添加音乐的位置类型
   * @param {boolean} isRemote - 是否为远程操作，默认为false
   */
  const list_music_move = async(fromId: string, toId: string, musicInfos: LX.Music.MusicInfo[], addMusicLocationType: LX.AddMusicLocationType, isRemote: boolean = false) => {
    if (isRemote) return
    await sendListAction({ action: 'list_music_move', data: { fromId, toId, musicInfos, addMusicLocationType } })
  }

  /**
   * 处理从列表移除音乐事件
   * @param {string} listId - 列表ID
   * @param {string[]} ids - 要移除的音乐ID数组
   * @param {boolean} isRemote - 是否为远程操作，默认为false
   */
  const list_music_remove = async(listId: string, ids: string[], isRemote: boolean = false) => {
    // 如果是远程操作或临时列表，则不处理
    if (isRemote || listId == LIST_IDS.TEMP) return
    await sendListAction({ action: 'list_music_remove', data: { listId, ids } })
  }

  /**
   * 处理更新列表音乐信息事件
   * @param {LX.List.ListActionMusicUpdate} musicInfos - 要更新的音乐信息
   * @param {boolean} isRemote - 是否为远程操作，默认为false
   */
  const list_music_update = async(musicInfos: LX.List.ListActionMusicUpdate, isRemote: boolean = false) => {
    // 过滤掉临时列表的音乐
    musicInfos = musicInfos.filter(item => item.id != LIST_IDS.TEMP)
    if (isRemote || !musicInfos.length) return
    await sendListAction({ action: 'list_music_update', data: musicInfos })
  }

  /**
   * 处理清空列表音乐事件
   * @param {string[]} ids - 要清空的列表ID数组
   * @param {boolean} isRemote - 是否为远程操作，默认为false
   */
  const list_music_clear = async(ids: string[], isRemote: boolean = false) => {
    if (isRemote) return
    await sendListAction({ action: 'list_music_clear', data: ids })
  }

  /**
   * 处理更新列表音乐位置事件
   * @param {string} listId - 列表ID
   * @param {number} position - 新的位置
   * @param {string[]} ids - 要更新位置的音乐ID数组
   * @param {boolean} isRemote - 是否为远程操作，默认为false
   */
  const list_music_update_position = async(listId: string, position: number, ids: string[], isRemote: boolean = false) => {
    // 如果是远程操作或临时列表，则不处理
    if (isRemote || listId == LIST_IDS.TEMP) return
    await sendListAction({ action: 'list_music_update_position', data: { listId, position, ids } })
  }
  global.lx.event_list.on('list_data_overwrite', list_data_overwrite)
  global.lx.event_list.on('list_create', list_create)
  global.lx.event_list.on('list_remove', list_remove)
  global.lx.event_list.on('list_update', list_update)
  global.lx.event_list.on('list_update_position', list_update_position)
  global.lx.event_list.on('list_music_overwrite', list_music_overwrite)
  global.lx.event_list.on('list_music_add', list_music_add)
  global.lx.event_list.on('list_music_move', list_music_move)
  global.lx.event_list.on('list_music_remove', list_music_remove)
  global.lx.event_list.on('list_music_update', list_music_update)
  global.lx.event_list.on('list_music_clear', list_music_clear)
  global.lx.event_list.on('list_music_update_position', list_music_update_position)
  return () => {
    global.lx.event_list.off('list_data_overwrite', list_data_overwrite)
    global.lx.event_list.off('list_create', list_create)
    global.lx.event_list.off('list_remove', list_remove)
    global.lx.event_list.off('list_update', list_update)
    global.lx.event_list.off('list_update_position', list_update_position)
    global.lx.event_list.off('list_music_overwrite', list_music_overwrite)
    global.lx.event_list.off('list_music_add', list_music_add)
    global.lx.event_list.off('list_music_move', list_music_move)
    global.lx.event_list.off('list_music_remove', list_music_remove)
    global.lx.event_list.off('list_music_update', list_music_update)
    global.lx.event_list.off('list_music_clear', list_music_clear)
    global.lx.event_list.off('list_music_update_position', list_music_update_position)
  }
}

/**
 * 处理远程列表动作
 * 用于处理从远端同步过来的列表变更
 * @param param0 列表动作事件对象
 * @param param0.action 动作类型
 * @param param0.data 动作数据
 */
export const handleRemoteListAction = async({ action, data }: LX.Sync.List.ActionList) => {
  // console.log('handleRemoteListAction', action)

  // 根据不同的动作类型处理相应的事件
  switch (action) {
    case 'list_data_overwrite': // 处理列表数据覆写
      await global.lx.event_list.list_data_overwrite(data, true)
      break
    case 'list_create': // 处理创建列表
      await global.lx.event_list.list_create(data.position, data.listInfos, true)
      break
    case 'list_remove': // 处理删除列表
      await global.lx.event_list.list_remove(data, true)
      break
    case 'list_update': // 处理更新列表信息
      await global.lx.event_list.list_update(data, true)
      break
    case 'list_update_position': // 处理更新列表位置
      await global.lx.event_list.list_update_position(data.position, data.ids, true)
      break
    case 'list_music_add': // 处理添加音乐
      await global.lx.event_list.list_music_add(data.id, data.musicInfos, data.addMusicLocationType, true)
      break
    case 'list_music_move': // 处理移动音乐
      await global.lx.event_list.list_music_move(data.fromId, data.toId, data.musicInfos, data.addMusicLocationType, true)
      break
    case 'list_music_remove': // 处理移除音乐
      await global.lx.event_list.list_music_remove(data.listId, data.ids, true)
      break
    case 'list_music_update': // 处理更新音乐信息
      await global.lx.event_list.list_music_update(data, true)
      break
    case 'list_music_update_position': // 处理更新音乐位置
      await global.lx.event_list.list_music_update_position(data.listId, data.position, data.ids, true)
      break
    case 'list_music_overwrite': // 处理覆写列表音乐
      await global.lx.event_list.list_music_overwrite(data.listId, data.musicInfos, true)
      break
    case 'list_music_clear': // 处理清空列表音乐
      await global.lx.event_list.list_music_clear(data, true)
      break
    default: // 处理未知的动作类型
      throw new Error('unknown list sync action')
  }
}
