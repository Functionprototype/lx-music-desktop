/**
 * utils/logInit.ts
 * 日志初始化文件
 * 负责配置应用程序的日志系统，设置日志级别和输出方式
 */

import log from 'electron-log/node' // 导入electron-log日志模块

// 设置文件日志级别为info，只记录info级别及以上的日志信息
log.transports.file.level = 'info'
// log.initialize() // 初始化日志系统（当前已注释）
