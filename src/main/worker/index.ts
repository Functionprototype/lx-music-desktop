/**
 * worker/index.ts
 * 工作线程入口文件
 * 负责创建和导出应用程序使用的工作线程，包括数据库服务等
 */

import { createDBServiceWorker } from './utils' // 导入数据库服务工作线程创建函数

/**
 * 创建工作线程
 * 初始化并返回应用程序所需的各种工作线程，目前包含数据库服务工作线程
 * @returns 包含各种工作线程的对象
 */
export default () => {
  return {
    dbService: createDBServiceWorker(), // 创建并返回数据库服务工作线程
  }
}

