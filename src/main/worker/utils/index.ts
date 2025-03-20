/**
 * worker/utils/index.ts
 * 工作线程工具入口文件
 * 提供创建数据库服务工作线程的功能，实现主线程与工作线程之间的通信
 */

import { Worker } from 'node:worker_threads' // 导入Node.js工作线程模块
import * as Comlink from 'comlink' // 导入Comlink库，用于线程间通信
import nodeEndpoint from 'comlink/dist/esm/node-adapter' // 导入Comlink的Node.js适配器

// 定义数据库服务类型，使用Comlink.Remote包装工作线程类型
export type DBSeriveTypes = Comlink.Remote<LX.WorkerDBSeriveListTypes>

/**
 * 创建数据库服务工作线程
 * 使用Worker API创建一个新的工作线程，并通过Comlink包装使其可以在主线程中调用
 * @returns 包装后的数据库服务工作线程对象，可以直接调用其方法
 */
export const createDBServiceWorker = () => {
  // 创建一个新的工作线程，指向dbService模块
  const worker: Worker = new Worker(new URL(
    /* webpackChunkName: 'dbService.worker' */
    '../dbService',
    import.meta.url,
  ))
  // 使用Comlink包装工作线程，使其可以在主线程中调用
  return Comlink.wrap<LX.WorkerDBSeriveListTypes>(nodeEndpoint(worker))
}

