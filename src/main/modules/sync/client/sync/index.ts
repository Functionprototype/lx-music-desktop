/**
 * 客户端同步模块入口文件
 * 该模块负责导出客户端同步相关的功能和接口
 */

// 导入同步处理器
import handler from './handler'
// 导入模块调用对象
import { callObj as _callObj } from '../modules'
// 导出模块配置
export { modules } from '../modules'

/**
 * 导出合并后的调用对象
 * 包含同步处理器的所有方法和模块调用对象的方法
 */
export const callObj = {
  ...handler,  // 同步处理器方法
  ..._callObj, // 模块调用方法
}
