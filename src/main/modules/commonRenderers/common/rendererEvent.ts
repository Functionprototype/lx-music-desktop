// 公共渲染进程事件处理器
// 负责处理全局应用设置、环境参数获取及系统字体管理
import { mainHandle, mainOn } from '@common/mainIpc'
import { CMMON_EVENT_NAME } from '@common/ipcNames'
import { getFonts } from '@main/utils/fontManage'

// 公共操作事件（公共，只注册一次）
export default () => {
  // 注册获取应用设置事件
  // 返回值: LX.AppSetting 应用配置对象
  mainHandle<LX.AppSetting>(CMMON_EVENT_NAME.get_app_setting, async() => {
    // 从全局状态获取当前应用设置
    return global.lx.appSetting
  })
  mainHandle<Partial<LX.AppSetting>>(CMMON_EVENT_NAME.set_app_setting, async({ params: config }) => {
    // 更新应用配置并触发相关事件
    global.lx.event_app.update_config(config)
  })

  mainHandle<LX.EnvParams>(CMMON_EVENT_NAME.get_env_params, async() => {
    // 返回环境参数包含Deeplink等信息
    return global.envParams
  })

  mainOn(CMMON_EVENT_NAME.clear_env_params_deeplink, () => {
    // 清理Deeplink环境参数
    global.envParams.deeplink = null
  })

  mainHandle<string[]>(CMMON_EVENT_NAME.get_system_fonts, async() => {
    // 获取系统可用字体列表
    return getFonts()
  })
}

