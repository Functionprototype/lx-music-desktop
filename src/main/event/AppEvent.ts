// 导入Node.js的事件模块，用于实现事件的发布与订阅机制
import { EventEmitter } from 'events'

// 导入应用程序配置相关的工具函数
import { saveAppHotKeyConfig, updateSetting } from '@main/utils'
// 导入Electron的BrowserWindow类型，用于窗口管理
import type { BrowserWindow } from 'electron'

/**
 * 应用程序事件管理类
 * 继承自EventEmitter，用于管理应用程序内的各种事件
 * 包括应用初始化、配置更新、主题变更、窗口状态变化等事件
 */
export class Event extends EventEmitter {
  // 已注释的方法，可能是历史遗留或待实现的功能
  // closeAll() {
  //   this.emit(COMMON_EVENT_NAME.closeAll)
  // }
  // initSetting() {
  //   this.emit(COMMON_EVENT_NAME.initConfig)
  //   // this.configStatus(null)
  // }

  /**
   * 初始化APP
   * 当应用程序完成初始化时触发此事件
   * 监听此事件的组件可以在应用初始化完成后执行相应的操作
   */
  app_inited() {
    // 触发'app_inited'事件，通知所有监听者应用已初始化
    this.emit('app_inited')
  }

  /**
   * 已更新的配置
   * 当应用配置被更新后触发此事件，通知相关组件配置已变更
   * @param keys 已更新配置的key数组，包含所有被修改的配置项的键名
   * @param setting 已更新的配置对象，包含所有被修改的配置项及其新值
   */
  updated_config(keys: Array<keyof LX.AppSetting>, setting: Partial<LX.AppSetting>) {
    // 触发'updated_config'事件，并传递已更新的配置键和值
    this.emit('updated_config', keys, setting)
  }

  /**
   * 更新配置
   * 处理配置更新请求，更新全局配置并触发相关事件
   * @param setting 新设置对象，包含需要更新的配置项
   */
  update_config(setting: Partial<LX.AppSetting>) {
    // 调用updateSetting工具函数处理配置更新，返回新的配置、已更新的键和已更新的设置
    const { setting: newSetting, updatedSettingKeys, updatedSetting } = updateSetting(setting)
    // 更新全局配置对象
    global.lx.appSetting = newSetting
    // 如果没有实际更新的配置项，则直接返回
    if (!updatedSettingKeys.length) return
    // 触发'update_config'事件，通知配置已更新，并传递完整的新配置
    this.emit('update_config', newSetting)
    // 调用updated_config方法，触发更详细的配置更新事件
    this.updated_config(updatedSettingKeys, updatedSetting)
  }

  /**
   * 系统主题变更事件
   * 当系统主题（亮色/暗色模式）发生变化时触发
   * @param isDark 布尔值，表示系统是否切换到暗色主题
   */
  system_theme_change(isDark: boolean) {
    // 触发'system_theme_change'事件，并传递主题是否为暗色的标志
    this.emit('system_theme_change', isDark)
  }

  /**
   * 应用主题变更事件
   * 当应用内部主题发生变化时触发
   */
  theme_change() {
    // 触发'theme_change'事件，通知应用内所有组件主题已变更
    this.emit('theme_change')
  }

  /**
   * 深度链接处理事件
   * 当应用通过深度链接（URL Scheme）被打开时触发
   * @param link 接收到的深度链接URL字符串
   */
  deeplink(link: string) {
    // 触发'deeplink'事件，并传递接收到的链接
    this.emit('deeplink', link)
  }

  /**
   * 播放器状态更新事件
   * 当播放器状态（如播放/暂停、音量等）发生变化时触发
   * @param status 包含播放器状态变更信息的对象
   */
  player_status(status: Partial<LX.Player.Status>) {
    // 遍历状态对象的所有键值对
    for (const [key, value] of Object.entries(status)) {
      // 更新全局播放器状态对象
      // @ts-expect-error 由于类型定义问题，这里使用ts-expect-error忽略类型检查
      global.lx.player_status[key] = value
    }
    // 触发'player_status'事件，并传递状态变更信息
    this.emit('player_status', status)
  }

  /**
   * 热键按下事件
   * 当用户按下已注册的热键时触发
   * @param keyInfo 热键信息对象，包含按键代码和修饰键等信息
   */
  hot_key_down(keyInfo: LX.HotKeyDownInfo) {
    // 触发'hot_key_down'事件，并传递热键信息
    this.emit('hot_key_down', keyInfo)
  }

  /**
   * 热键配置更新事件
   * 当用户修改热键配置时触发
   * @param config 新的热键配置对象，包含全局和本地热键设置
   */
  hot_key_config_update(config: LX.HotKeyConfigAll) {
    // 保存热键配置到存储
    saveAppHotKeyConfig(config)
    // 触发'hot_key_config_update'事件，并传递新的配置
    this.emit('hot_key_config_update', config)
  }

  /**
   * 主窗口创建事件
   * 当应用的主窗口被创建时触发
   * @param win 创建的主窗口实例
   */
  main_window_created(win: BrowserWindow) {
    // 触发'main_window_created'事件，并传递窗口实例
    this.emit('main_window_created', win)
  }

  /**
   * 主窗口准备显示事件
   * 当主窗口内容加载完成，准备显示时触发
   */
  main_window_ready_to_show() {
    // 触发'main_window_ready_to_show'事件
    this.emit('main_window_ready_to_show')
  }

  /**
   * 主窗口初始化完成事件
   * 当主窗口完成初始化（包括DOM加载和脚本执行）时触发
   */
  main_window_inited() {
    // 触发'main_window_inited'事件
    this.emit('main_window_inited')
  }

  /**
   * 主窗口显示事件
   * 当主窗口从隐藏状态变为显示状态时触发
   */
  main_window_show() {
    // 触发'main_window_show'事件
    this.emit('main_window_show')
  }

  /**
   * 主窗口隐藏事件
   * 当主窗口从显示状态变为隐藏状态时触发
   */
  main_window_hide() {
    // 触发'main_window_hide'事件
    this.emit('main_window_hide')
  }

  /**
   * 主窗口获得焦点事件
   * 当主窗口获得系统焦点时触发
   */
  main_window_focus() {
    // 触发'main_window_focus'事件
    this.emit('main_window_focus')
  }

  /**
   * 主窗口失去焦点事件
   * 当主窗口失去系统焦点时触发
   */
  main_window_blur() {
    // 触发'main_window_blur'事件
    this.emit('main_window_blur')
  }

  /**
   * 主窗口关闭事件
   * 当用户尝试关闭主窗口时触发
   */
  main_window_close() {
    // 触发'main_window_close'事件
    this.emit('main_window_close')
  }

  /**
   * 主窗口全屏状态变更事件
   * 当主窗口进入或退出全屏模式时触发
   * @param isFullscreen 布尔值，表示窗口是否处于全屏状态
   */
  main_window_fullscreen(isFullscreen: boolean) {
    // 触发'main_window_fullscreen'事件，并传递全屏状态
    this.emit('main_window_fullscreen', isFullscreen)
  }

  /**
   * 桌面歌词窗口创建事件
   * 当桌面歌词窗口被创建时触发
   * @param win 创建的桌面歌词窗口实例
   */
  desktop_lyric_window_created(win: BrowserWindow) {
    // 触发'desktop_lyric_window_created'事件，并传递窗口实例
    this.emit('desktop_lyric_window_created', win)
  }
}


/**
 * 事件方法类型定义
 * 从EventType中排除EventEmitter的属性，只保留自定义的事件方法
 */
type EventMethods = Omit<EventType, keyof EventEmitter>

/**
 * 事件类型声明
 * 扩展Event类，提供类型安全的事件监听方法
 * 通过泛型约束确保事件名和监听器函数的类型匹配
 */
declare class EventType extends Event {
  /**
   * 添加事件监听器
   * @param event 事件名称
   * @param listener 事件监听器函数
   * @returns this 返回当前实例，支持链式调用
   */
  on<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): this

  /**
   * 添加一次性事件监听器，触发后自动移除
   * @param event 事件名称
   * @param listener 事件监听器函数
   * @returns this 返回当前实例，支持链式调用
   */
  once<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): this

  /**
   * 移除事件监听器
   * @param event 事件名称
   * @param listener 要移除的事件监听器函数
   * @returns this 返回当前实例，支持链式调用
   */
  off<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): this
}

/**
 * 导出的事件类型
 * 从EventType中保留on、off、once方法，排除其他EventEmitter的方法
 * 这样导出的类型只包含我们需要的事件注册和移除方法
 */
export type Type = Omit<EventType, keyof Omit<EventEmitter, 'on' | 'off' | 'once'>>
