// 不喜欢列表管理事件处理器
// 负责处理不喜欢音乐列表的获取、添加、覆盖和清除操作
import { mainHandle } from '@common/mainIpc'
import { DISLIKE_EVENT_NAME } from '@common/ipcNames'

// 列表操作事件（公共，只注册一次）
export default () => {
  // 注册不喜欢列表相关事件处理器
  mainHandle<LX.Dislike.DislikeInfo>(DISLIKE_EVENT_NAME.get_dislike_music_infos, async() => {
    // 获取当前所有不喜欢音乐信息
    return global.lx.worker.dbService.getDislikeListInfo()
  })
  mainHandle<LX.Dislike.DislikeMusicInfo[]>(DISLIKE_EVENT_NAME.add_dislike_music_infos, async({ params: listData }) => {
    // 批量添加不喜欢音乐条目
    await global.lx.event_dislike.dislike_music_add(listData, false)
  })
  mainHandle<LX.Dislike.DislikeRules>(DISLIKE_EVENT_NAME.overwrite_dislike_music_infos, async({ params: rules }) => {
    // 完全覆盖现有不喜欢规则
    await global.lx.event_dislike.dislike_data_overwrite(rules, false)
  })
  mainHandle(DISLIKE_EVENT_NAME.clear_dislike_music_infos, async() => {
    // 清空所有不喜欢音乐数据
    await global.lx.event_dislike.dislike_music_clear(false)
  })
}
