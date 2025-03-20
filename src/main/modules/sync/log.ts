import { log as writeLog } from '@common/utils'

/**
 * 同步模块的日志记录工具
 * 提供了两组日志记录方法：
 * 1. r_info、r_warn、r_error：直接写入日志文件
 * 2. info、warn、error：仅在控制台输出（原计划根据配置决定是否写入文件）
 */
export default {
  /**
   * 记录信息级别日志到文件
   * @param params 日志参数
   */
  r_info(...params: any[]) {
    writeLog.info(...params)
  },
  /**
   * 记录警告级别日志到文件
   * @param params 日志参数
   */
  r_warn(...params: any[]) {
    writeLog.warn(...params)
  },
  /**
   * 记录错误级别日志到文件
   * @param params 日志参数
   */
  r_error(...params: any[]) {
    writeLog.error(...params)
  },
  /**
   * 在控制台输出信息级别日志
   * @param params 日志参数
   */
  info(...params: any[]) {
    // if (global.lx.isEnableSyncLog) writeLog.info(...params)
    console.log(...params)
  },
  /**
   * 在控制台输出警告级别日志
   * @param params 日志参数
   */
  warn(...params: any[]) {
    // if (global.lx.isEnableSyncLog) writeLog.warn(...params)
    console.warn(...params)
  },
  /**
   * 在控制台输出错误级别日志
   * @param params 日志参数
   */
  error(...params: any[]) {
    // if (global.lx.isEnableSyncLog) writeLog.error(...params)
    console.warn(...params)
  },
}
