/**
 * worker/utils/worker.ts
 * 工作线程工具文件
 * 提供工作线程与主线程之间通信的功能，使用Comlink库实现线程间对象共享
 */

import worker from 'node:worker_threads' // 导入Node.js工作线程模块
import * as Comlink from 'comlink' // 导入Comlink库，用于线程间通信
import nodeEndpoint from 'comlink/dist/esm/node-adapter' // 导入Comlink的Node.js适配器

/**
 * 暴露工作线程对象给主线程
 * 使用Comlink库将工作线程中的对象暴露给主线程，实现线程间的远程过程调用
 * @param obj 要暴露的对象，通常包含工作线程提供的各种方法和属性
 */
export const exposeWorker = (obj: any) => {
  if (worker.parentPort == null) return // 如果没有父端口，则直接返回
  Comlink.expose(obj, nodeEndpoint(worker.parentPort)) // 使用Comlink暴露对象到父线程
}
