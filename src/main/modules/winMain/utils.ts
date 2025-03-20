/**
 * modules/winMain/utils.ts
 * 主窗口工具函数文件
 * 提供主窗口相关的工具函数，包括窗口大小获取和任务栏按钮创建等功能
 */

// import fs from 'fs'
import path from 'node:path' // 导入Node.js路径模块
import { type WindowSize, windowSizeList } from '@common/config' // 导入窗口大小配置
import { nativeImage } from 'electron' // 导入Electron原生图像模块

/**
 * 获取窗口大小信息
 * 根据窗口大小ID查找对应的窗口大小配置，如果未找到则返回默认大小
 * @param windowSizeId 窗口大小ID
 * @returns 窗口大小配置对象
 */
export const getWindowSizeInfo = (windowSizeId: number | string): WindowSize => {
  return windowSizeList.find(i => i.id == windowSizeId) ?? windowSizeList[0]
}

/**
 * 获取图标路径
 * 根据图标名称获取任务栏按钮图标的完整路径并创建原生图像对象
 * @param name 图标名称
 * @returns Electron原生图像对象
 */
const getIconPath = (name: string): Electron.NativeImage => {
  return nativeImage.createFromPath(path.join(global.staticPath, 'images/taskbar', name + '.png'))
}

/**
 * 创建任务栏按钮
 * 根据播放器状态创建Windows任务栏缩略图按钮，用于控制播放器
 * @param param0 任务栏按钮标志配置，包括是否为空、是否收藏、是否播放等状态
 * @param onClick 按钮点击回调函数
 * @returns 任务栏按钮数组
 */
export const createTaskBarButtons = ({
  empty = false, // 是否为空状态（无歌曲）
  collect = false, // 是否已收藏
  play = false, // 是否正在播放
  next = true, // 下一曲按钮是否可用
  prev = true, // 上一曲按钮是否可用
}: LX.TaskBarButtonFlags, onClick: (action: LX.Player.StatusButtonActions) => void): Electron.ThumbarButton[] => {
  // 创建任务栏按钮数组
  const buttons: Electron.ThumbarButton[] = [
    // 收藏/取消收藏按钮
    collect
      ? {
          icon: getIconPath('collected'), // 已收藏图标
          click() {
            onClick('unCollect') // 点击执行取消收藏操作
          },
          tooltip: '取消收藏', // 按钮提示文本
          flags: ['nobackground'], // 按钮样式标志
        }
      : {
          icon: getIconPath('collect'), // 未收藏图标
          click() {
            onClick('collect') // 点击执行收藏操作
          },
          tooltip: '收藏', // 按钮提示文本
          flags: ['nobackground'], // 按钮样式标志
        },
    // 上一曲按钮
    {
      icon: getIconPath('prev'), // 上一曲图标
      click() {
        onClick('prev') // 点击执行上一曲操作
      },
      tooltip: '上一曲', // 按钮提示文本
      flags: prev ? ['nobackground'] : ['nobackground', 'disabled'], // 根据状态设置按钮是否可用
    },
    // 播放/暂停按钮
    play
      ? {
          icon: getIconPath('pause'), // 暂停图标
          click() {
            onClick('pause') // 点击执行暂停操作
          },
          tooltip: '暂停', // 按钮提示文本
          flags: ['nobackground'], // 按钮样式标志
        }
      : {
          icon: getIconPath('play'), // 播放图标
          click() {
            onClick('play') // 点击执行播放操作
          },
          tooltip: '播放', // 按钮提示文本
          flags: ['nobackground'], // 按钮样式标志
        },
    // 下一曲按钮
    {
      icon: getIconPath('next'), // 下一曲图标
      click() {
        onClick('next') // 点击执行下一曲操作
      },
      tooltip: '下一曲', // 按钮提示文本
      flags: next ? ['nobackground'] : ['nobackground', 'disabled'], // 根据状态设置按钮是否可用
    },
  ]
  
  // 如果是空状态（无歌曲），禁用所有按钮
  if (empty) {
    for (const button of buttons) {
      button.flags = ['nobackground', 'disabled']
    }
  }
  return buttons // 返回创建的按钮数组
}
