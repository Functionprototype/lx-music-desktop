
/**
 * 获取本地不喜欢列表数据
 * @description 从数据库服务获取本地存储的不喜欢规则列表
 * @returns {Promise<LX.Dislike.DislikeRules>} 返回不喜欢规则列表数据
 */
export const getLocalDislikeData = async(): Promise<LX.Dislike.DislikeRules> => {
  // 通过数据库服务获取不喜欢列表信息，并返回其中的规则部分
  return (await global.lx.worker.dbService.getDislikeListInfo()).rules
}

/**
 * 设置本地不喜欢列表数据
 * @param listData 要设置的不喜欢规则列表数据
 */
export const setLocalDislikeData = async(listData: LX.Dislike.DislikeRules) => {
  await global.lx.event_dislike.dislike_data_overwrite(listData, true)
}

/**
 * 注册不喜欢列表动作事件
 * 用于处理本地不喜欢列表变更时向远端同步数据
 * @param sendDislikeAction 发送不喜欢列表动作的回调函数
 * @returns 返回取消注册事件的函数
 */
export const registerDislikeActionEvent = (sendDislikeAction: (action: LX.Sync.Dislike.ActionList) => (void | Promise<void>)) => {
  // 处理添加不喜欢音乐事件
  const dislike_music_add = async(listData: LX.Dislike.DislikeMusicInfo[], isRemote: boolean = false) => {
    if (isRemote) return
    await sendDislikeAction({ action: 'dislike_music_add', data: listData })
  }
  // 处理覆写不喜欢列表数据事件
  const dislike_data_overwrite = async(listInfos: LX.Dislike.DislikeRules, isRemote: boolean = false) => {
    if (isRemote) return
    await sendDislikeAction({ action: 'dislike_data_overwrite', data: listInfos })
  }
  // 处理清空不喜欢列表事件
  const dislike_music_clear = async(isRemote: boolean = false) => {
    if (isRemote) return
    await sendDislikeAction({ action: 'dislike_music_clear' })
  }

  global.lx.event_dislike.on('dislike_music_add', dislike_music_add)
  global.lx.event_dislike.on('dislike_data_overwrite', dislike_data_overwrite)
  global.lx.event_dislike.on('dislike_music_clear', dislike_music_clear)
  return () => {
    global.lx.event_dislike.off('dislike_music_add', dislike_music_add)
    global.lx.event_dislike.off('dislike_data_overwrite', dislike_data_overwrite)
    global.lx.event_dislike.off('dislike_music_clear', dislike_music_clear)
  }
}

/**
 * 处理远程不喜欢列表动作
 * 用于处理从远端同步过来的不喜欢列表变更
 * @param event 不喜欢列表动作事件对象
 */
export const handleRemoteDislikeAction = async(event: LX.Sync.Dislike.ActionList) => {
  // console.log('handleRemoteDislikeAction', event)

  switch (event.action) {
    case 'dislike_music_add':
      await global.lx.event_dislike.dislike_music_add(event.data, true)
      break
    case 'dislike_data_overwrite':
      await global.lx.event_dislike.dislike_data_overwrite(event.data, true)
      break
    case 'dislike_music_clear':
      await global.lx.event_dislike.dislike_music_clear(true)
      break
    default:
      throw new Error('unknown list sync action')
  }
}
