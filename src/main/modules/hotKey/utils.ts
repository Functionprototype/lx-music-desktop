/**
 * modules/hotKey/utils.ts
 * 热键工具函数文件
 * 提供热键注册、注销和处理的工具函数，管理全局快捷键
 */

import { globalShortcut } from 'electron' // 导入Electron全局快捷键模块
import { log } from '@common/utils' // 导入日志工具

/**
 * 处理热键按下事件
 * 当热键被触发时，发送热键按下事件到应用事件系统
 * @param key 被按下的热键标识
 */
export const handleKeyDown = (key: string) => {
  if (!global.lx.hotKey.enable) return // 如果热键功能被禁用，则直接返回
  global.lx.event_app.hot_key_down({ type: 'global', key }) // 触发热键按下事件
}

// 定义转换键名的正则表达式，匹配以+分隔的小写字母
const transformedKeyRxp = /(^|\+)[a-z]/g

/**
 * 转换热键格式
 * 将内部热键格式转换为Electron可识别的快捷键格式
 * @param key 内部热键格式
 * @returns Electron可识别的快捷键格式
 */
export const transformedKey = (key: string): string => {
  if (key.includes('arrow')) key = key.replace(/arrow/g, '') // 移除arrow前缀
  return key.replace('mod', 'CommandOrControl').replace(transformedKeyRxp, l => l.toUpperCase())
}

/**
 * 注册热键
 * 将指定的热键注册到系统中，使其可以在全局范围内响应
 * @param param0 包含热键标识和信息的对象
 * @returns 注册是否成功
 */
export const registerHotkey = ({ key, info }: LX.RegisterKeyInfo): boolean => {
  let targetKey = global.lx.hotKey.state.get(key) // 获取热键状态
  if (targetKey?.status) return true // 如果热键已注册且状态正常，直接返回成功
  const transKey = transformedKey(key) // 转换热键格式
  // console.log('Register key:', transKey)
  if (targetKey) {
    targetKey.info = info // 更新现有热键信息
  } else {
    targetKey = { // 创建新的热键状态对象
      status: false,
      info,
    }
    global.lx.hotKey.state.set(key, targetKey) // 将热键状态保存到全局状态中
  }
  // 注册热键，如果已被注册则返回失败，否则注册并设置回调函数
  const status = targetKey.status = globalShortcut.isRegistered(transKey)
    ? false
    : globalShortcut.register(transKey, () => {
      handleKeyDown(key) // 热键触发时调用处理函数
    })
  return status // 返回注册状态
}

/**
 * 注销热键
 * 从系统中移除指定的热键注册
 * @param key 要注销的热键标识
 */
export const unRegisterHotkey = (key: string) => {
  let transKey = transformedKey(key) // 转换热键格式
  // console.log('Unregister key:', transKey)
  globalShortcut.unregister(transKey) // 从系统中注销热键
  global.lx.hotKey.state.delete(key) // 从全局状态中移除热键
}

/**
 * 注销所有热键
 * 清空所有已注册的热键，通常在应用退出时调用
 */
export const unRegisterHotkeyAll = () => {
  global.lx.hotKey.state.clear() // 清空热键状态映射
  globalShortcut.unregisterAll() // 注销所有系统热键
}


/**
 * 处理热键注册
 * 注册单个热键并处理可能的错误
 * @param data 热键注册信息
 */
const handleRegisterHotkey = (data: LX.RegisterKeyInfo) => {
  let ret = registerHotkey(data) // 尝试注册热键
  if (!ret) log.info('Register hot key failed:', data.key) // 注册失败时记录日志
}

/**
 * 初始化热键
 * 清空并重新注册所有全局热键
 * @param isForce 是否强制初始化，即使全局热键功能被禁用
 */
export const init = (isForce = false) => {
  unRegisterHotkeyAll() // 先注销所有热键
  if (!isForce && !global.lx.hotKey.config.global.enable) return // 如果不是强制且全局热键被禁用，则直接返回
  // 遍历所有配置的全局热键并注册
  for (const key of Object.keys(global.lx.hotKey.config.global.keys)) {
    try {
      handleRegisterHotkey({ key, info: global.lx.hotKey.config.global.keys[key] })
    } catch (err) {
      log.info(err) // 记录注册过程中的错误
    }
  }
}
