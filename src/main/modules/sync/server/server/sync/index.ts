/**
 * 同步功能模块入口文件
 * 负责导出同步相关的处理器、事件和模块
 */

// 导入本地同步处理器
import handler from './handler'

// 导入其他模块的处理器
import { callObj as _callObj } from '../../modules'

// 导出同步核心功能
export { sync } from './sync'

// 导出功能模块
export { modules } from '../../modules'

// 导出事件相关功能
export * from './event'

/**
 * 合并所有处理器
 * 包含本地同步处理器和其他模块的处理器
 */
export const callObj = {
  ...handler,
  ..._callObj,
}
