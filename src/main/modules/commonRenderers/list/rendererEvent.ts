// 播放列表管理事件处理器
// 负责处理用户列表的创建、删除、更新及音乐条目管理
import { mainHandle } from '@common/mainIpc'
import { PLAYER_EVENT_NAME } from '@common/ipcNames'

// 列表操作事件（公共，只注册一次）
export default () => {
  // 注册播放列表相关事件处理器
  mainHandle<LX.List.UserListInfo[]>(PLAYER_EVENT_NAME.list_get, async() => {
    // 获取所有用户列表信息
    return global.lx.worker.dbService.getAllUserList()
  })
  mainHandle<LX.List.ListActionDataOverwrite>(PLAYER_EVENT_NAME.list_data_overwire, async({ params: listData }) => {
    // 完全覆盖现有列表数据
    await global.lx.event_list.list_data_overwrite(listData, false)
  })
  mainHandle<LX.List.ListActionAdd>(PLAYER_EVENT_NAME.list_add, async({ params: { position, listInfos } }) => {
    // 在指定位置创建新列表
    await global.lx.event_list.list_create(position, listInfos, false)
  })
  mainHandle<LX.List.ListActionRemove>(PLAYER_EVENT_NAME.list_remove, async({ params: ids }) => {
    // 批量删除指定ID的列表
    await global.lx.event_list.list_remove(ids, false)
  })
  mainHandle<LX.List.ListActionUpdate>(PLAYER_EVENT_NAME.list_update, async({ params: listInfos }) => {
    // 更新多个列表元数据
    await global.lx.event_list.list_update(listInfos, false)
  })
  mainHandle<LX.List.ListActionUpdatePosition>(PLAYER_EVENT_NAME.list_update_position, async({ params: { position, ids } }) => {
    // 调整列表排序位置
    await global.lx.event_list.list_update_position(position, ids, false)
  })
  mainHandle<string, LX.Music.MusicInfo[]>(PLAYER_EVENT_NAME.list_music_get, async({ params: listId }) => {
    // 获取指定列表的音乐条目
    return global.lx.worker.dbService.getListMusics(listId)
  })
  mainHandle<LX.List.ListActionMusicAdd>(PLAYER_EVENT_NAME.list_music_add, async({ params: { id, musicInfos, addMusicLocationType } }) => {
    // 向列表添加音乐条目
    await global.lx.event_list.list_music_add(id, musicInfos, addMusicLocationType, false)
  })
  mainHandle<LX.List.ListActionMusicMove>(PLAYER_EVENT_NAME.list_music_move, async({ params: { fromId, toId, musicInfos, addMusicLocationType } }) => {
    // 跨列表移动音乐条目
    await global.lx.event_list.list_music_move(fromId, toId, musicInfos, addMusicLocationType, false)
  })
  mainHandle<LX.List.ListActionMusicRemove>(PLAYER_EVENT_NAME.list_music_remove, async({ params: { listId, ids } }) => {
    // 从列表移除指定音乐
    await global.lx.event_list.list_music_remove(listId, ids, false)
  })
  mainHandle<LX.List.ListActionMusicUpdate>(PLAYER_EVENT_NAME.list_music_update, async({ params: musicInfos }) => {
    // 批量更新音乐元数据
    await global.lx.event_list.list_music_update(musicInfos, false)
  })
  mainHandle<LX.List.ListActionMusicUpdatePosition>(PLAYER_EVENT_NAME.list_music_update_position, async({ params: { listId, position, ids } }) => {
    // 调整列表内音乐排序
    await global.lx.event_list.list_music_update_position(listId, position, ids, false)
  })
  mainHandle<LX.List.ListActionMusicOverwrite>(PLAYER_EVENT_NAME.list_music_overwrite, async({ params: { listId, musicInfos } }) => {
    // 完全覆盖列表音乐数据
    await global.lx.event_list.list_music_overwrite(listId, musicInfos, false)
  })
  mainHandle<LX.List.ListActionMusicClear>(PLAYER_EVENT_NAME.list_music_clear, async({ params: listId }) => {
    // 清空指定列表所有音乐
    await global.lx.event_list.list_music_clear(listId, false)
  })
  mainHandle<LX.List.ListActionCheckMusicExistList, boolean>(PLAYER_EVENT_NAME.list_music_check_exist, async({ params: { listId, musicInfoId } }) => {
    // 检查音乐是否存在于列表
    return global.lx.worker.dbService.checkListExistMusic(listId, musicInfoId)
  })
  mainHandle<string, string[]>(PLAYER_EVENT_NAME.list_music_get_list_ids, async({ params: musicInfoId }) => {
    return global.lx.worker.dbService.getMusicExistListIds(musicInfoId)
  })
}
