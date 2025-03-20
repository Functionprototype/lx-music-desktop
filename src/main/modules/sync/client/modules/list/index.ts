
/**
 * @file 客户端列表同步模块入口文件
 * 该模块负责导出列表同步相关的处理器和事件管理函数
 */

// 导出列表同步处理器，用于处理服务端发来的同步请求
export { default as handler } from './handler'

// 导出本地事件管理函数，用于管理本地列表变更的同步
export * from './localEvent'
