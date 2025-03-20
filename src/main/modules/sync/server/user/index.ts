/**
 * 用户空间管理模块
 * 负责管理用户数据、列表和不喜欢列表等功能
 */

import { UserDataManage } from './data'
import {
  ListManage,
  DislikeManage,
} from '../modules'

/**
 * 用户空间接口定义
 * 包含用户数据管理、列表管理、不喜欢列表管理以及设备管理相关方法
 */
export interface UserSpace {
  /** 用户数据管理器 */
  dataManage: UserDataManage
  /** 列表管理器 */
  listManage: ListManage
  /** 不喜欢列表管理器 */
  dislikeManage: DislikeManage
  /** 获取所有已连接设备信息 */
  getDecices: () => Promise<LX.Sync.ServerKeyInfo[]>
  /** 移除指定设备 */
  removeDevice: (clientId: string) => Promise<void>
}
/** 存储所有用户空间的映射表，键为用户名，值为用户空间对象 */
const users = new Map<string, UserSpace>()

/** 延迟释放用户空间的时间（毫秒） */
const delayTime = 10 * 1000
/** 存储延迟释放用户空间的定时器，键为用户名，值为定时器ID */
const delayReleaseTimeouts = new Map<string, NodeJS.Timeout>()
/**
 * 清除用户空间的延迟释放定时器
 * @param userName 用户名
 */
const clearDelayReleaseTimeout = (userName: string) => {
  if (!delayReleaseTimeouts.has(userName)) return

  clearTimeout(delayReleaseTimeouts.get(userName))
  delayReleaseTimeouts.delete(userName)
}
/**
 * 启动用户空间的延迟释放定时器
 * 在指定时间后自动释放用户空间
 * @param userName 用户名
 */
const seartDelayReleaseTimeout = (userName: string) => {
  clearDelayReleaseTimeout(userName)
  delayReleaseTimeouts.set(userName, setTimeout(() => {
    users.delete(userName)
  }, delayTime))
}

/**
 * 获取用户空间
 * 如果用户空间不存在则创建新的用户空间
 * 同时清除该用户的延迟释放定时器（如果存在）
 * @param userName 用户名，默认为'default'
 * @returns 用户空间对象
 */
export const getUserSpace = (userName = 'default') => {
  // 清除延迟释放定时器，确保用户空间不会被自动释放
  clearDelayReleaseTimeout(userName)

  let user = users.get(userName)
  if (!user) {
    console.log('new user data manage:', userName)
    // 创建用户数据管理器
    const dataManage = new UserDataManage(userName)
    // 创建列表管理器
    const listManage = new ListManage(dataManage)
    // 创建不喜欢列表管理器
    const dislikeManage = new DislikeManage(dataManage)
    // 创建并存储用户空间
    users.set(userName, user = {
      dataManage,
      listManage,
      dislikeManage,
      /**
       * 获取所有已连接设备信息
       * @returns 设备信息数组
       */
      async getDecices() {
        return this.dataManage.getAllClientKeyInfo()
      },
      /**
       * 移除指定设备
       * @param clientId 客户端ID
       */
      async removeDevice(clientId) {
        await listManage.removeDevice(clientId)
        await dataManage.removeClientKeyInfo(clientId)
      },
    })
  }
  return user
}

/**
 * 释放用户空间
 * @param userName 用户名，默认为'default'
 * @param force 是否强制立即释放，默认为false（延迟释放）
 */
export const releaseUserSpace = (userName = 'default', force = false) => {
  if (force) {
    // 强制立即释放：清除定时器并立即删除用户空间
    clearDelayReleaseTimeout(userName)
    users.delete(userName)
  } else {
    // 延迟释放：启动延迟释放定时器
    seartDelayReleaseTimeout(userName)
  }
}


// 导出数据管理模块的所有内容
export * from './data'
