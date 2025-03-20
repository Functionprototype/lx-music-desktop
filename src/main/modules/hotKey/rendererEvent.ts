import { HOTKEY_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { mainHandle } from '@common/mainIpc'
import { init, registerHotkey, unRegisterHotkey, unRegisterHotkeyAll } from './utils'


export default () => {
  // 处理热键配置更新操作
  mainHandle<LX.HotKeyActions, boolean>(HOTKEY_RENDERER_EVENT_NAME.set_config, async({ params }) => {
    switch (params.action) {
      // 更新全局热键配置
      case 'config':
        global.lx.event_app.hot_key_config_update(params.data)
        return true
      // 启用/禁用全局热键
      case 'enable':
        global.lx.hotKey.enable = params.data
        params.data ? init(true) : unRegisterHotkeyAll()  // 启用时初始化，禁用时注销所有热键
        return true
      // 注册单个热键
      case 'register':
        return registerHotkey(params.data)
      
      // 注销单个热键
      case 'unregister':
        unRegisterHotkey(params.data)
        return true
    }
  })

  // 获取当前热键状态
  mainHandle<LX.HotKeyState>(HOTKEY_RENDERER_EVENT_NAME.status, async() => global.lx.hotKey.state)

  // 热键功能开关控制
  mainHandle<boolean>(HOTKEY_RENDERER_EVENT_NAME.enable, async({ params: flag }) => {
    flag ? init() : unRegisterHotkeyAll()  // 根据标记初始化或清除所有热键
  })

  init()
}
