/**
 * event/index.ts
 * 事件模块入口文件
 * 负责导出应用程序的各类事件处理器创建函数，包括应用事件、列表事件和不喜欢列表事件
 */

import { Event as App, type Type as AppType } from './AppEvent' // 导入应用事件类和类型
import { Event as List, type Type as ListType } from './ListEvent' // 导入列表事件类和类型
import { Event as Dislike, type Type as DislikeType } from './DislikeEvent' // 导入不喜欢列表事件类和类型

// 导出事件类型定义，供其他模块使用
export type {
  AppType, // 应用事件类型
  ListType, // 列表事件类型
  DislikeType, // 不喜欢列表事件类型
}

/**
 * 创建应用事件处理器
 * 用于处理应用程序级别的事件，如配置更新、主题变更、热键触发等
 * @returns 应用事件处理器实例
 */
export const createAppEvent = (): AppType => {
  return new App()
}

/**
 * 创建列表事件处理器
 * 用于处理音乐列表相关的事件，如列表创建、删除、歌曲添加移除等
 * @returns 列表事件处理器实例
 */
export const createListEvent = (): ListType => {
  return new List()
}

/**
 * 创建不喜欢列表事件处理器
 * 用于处理不喜欢列表相关的事件，如添加或移除不喜欢的歌曲等
 * @returns 不喜欢列表事件处理器实例
 */
export const createDislikeEvent = (): DislikeType => {
  return new Dislike()
}

