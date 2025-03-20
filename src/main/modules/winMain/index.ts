/**
 * winMain/index.ts
 * 主窗口模块入口文件
 * 负责初始化主窗口相关的事件监听和功能，包括渲染进程事件、自动更新、热键处理等
 */

import initRendererEvent, { handleKeyDown, hotKeyConfigUpdate } from './rendererEvent'

import { APP_EVENT_NAMES } from '@common/constants'
import { createWindow, minimize, setProgressBar, setProxy, setThumbarButtons, toggleHide, toggleMinimize } from './main'
import initUpdate from './autoUpdate'
import { HOTKEY_COMMON } from '@common/hotKey'
import { quitApp } from '@main/app'

/**
 * 主窗口模块初始化函数
 * 初始化渲染进程事件、自动更新功能，并设置全局热键监听
 */
export default () => {
  // 初始化渲染进程事件处理
  initRendererEvent()
  // 初始化自动更新功能
  initUpdate()

  // 监听全局热键按下事件
  global.lx.event_app.on('hot_key_down', ({ type, key }) => {
    // 获取热键配置信息
    let info = global.lx.hotKey.config.global.keys[key]
    // 如果热键不属于主窗口，则忽略
    if (info?.type != APP_EVENT_NAMES.winMainName) return
    // 根据热键动作类型执行相应操作
    switch (info.action) {
      case HOTKEY_COMMON.close.action: // 关闭应用
        quitApp()
        break
      case HOTKEY_COMMON.hide_toggle.action: // 切换窗口显示/隐藏状态
        toggleHide()
        break
      case HOTKEY_COMMON.min.action: // 最小化窗口
        minimize()
        break
      case HOTKEY_COMMON.min_toggle.action: // 切换窗口最小化状态
        toggleMinimize()
        break
      default: // 处理其他类型的热键
        handleKeyDown(type, key)
        break
    }
  })
  // 监听热键配置更新事件
  global.lx.event_app.on('hot_key_config_update', (config) => {
    // 更新热键配置
    hotKeyConfigUpdate(config)
  })

  // 监听应用初始化完成事件
  global.lx.event_app.on('app_inited', () => {
    // 创建主窗口
    createWindow()
  })

  // 定义需要监听的播放器状态键
  const keys = (['status', 'collect'] as const) satisfies Array<keyof LX.Player.Status>
  
  // 任务栏按钮状态标志
  const taskBarButtonFlags: LX.TaskBarButtonFlags = {
    empty: true,    // 是否为空状态（无歌曲）
    collect: false, // 是否已收藏
    play: false,    // 是否正在播放
    next: true,     // 下一曲按钮是否可用
    prev: true,     // 上一曲按钮是否可用
  }
  
  // 进度条状态
  const progressStatus = {
    progress: -1,
    status: 'none' as Electron.ProgressBarOptions['mode'],
  }
  let showProgress = global.lx.appSetting['player.isShowTaskProgess']
  global.lx.event_app.on('player_status', (status) => {
    if (status.status) {
      switch (status.status) {
        case 'paused':
          taskBarButtonFlags.play = false
          taskBarButtonFlags.empty &&= false
          progressStatus.status = 'paused'
          break
        case 'error':
          taskBarButtonFlags.play = false
          taskBarButtonFlags.empty &&= false
          progressStatus.status = 'error'
          break
        case 'playing':
          taskBarButtonFlags.play = true
          taskBarButtonFlags.empty &&= false
          progressStatus.status = 'normal'
          break
        case 'stoped':
          taskBarButtonFlags.play &&= false
          taskBarButtonFlags.empty = true
          progressStatus.status = 'none'
          progressStatus.progress = 0
          break
      }
      if (showProgress) {
        setProgressBar(progressStatus.progress, {
          mode: progressStatus.status,
        })
      }
    }
    if (keys.some(k => status[k] != null)) {
      if (status.collect != null) taskBarButtonFlags.collect = status.collect
      setThumbarButtons(taskBarButtonFlags)
    }
    if (showProgress && status.progress != null) {
      const progress = global.lx.player_status.duration ? status.progress / global.lx.player_status.duration : 0
      if (progress.toFixed(2) != progressStatus.progress.toFixed(2)) {
        progressStatus.progress = progress < 0.01 ? 0.01 : progress
        setProgressBar(progressStatus.progress, {
          mode: progressStatus.status,
        })
      }
    }
  })
  global.lx.event_app.on('updated_config', (keys, setting) => {
    if (keys.includes('player.isShowTaskProgess')) {
      showProgress = setting['player.isShowTaskProgess']!
      if (showProgress) {
        setProgressBar(progressStatus.progress, {
          mode: progressStatus.status,
        })
      } else {
        setProgressBar(-1, { mode: 'none' })
      }
    }
    if (keys.includes('network.proxy.enable') || (global.lx.appSetting['network.proxy.enable'] && keys.some(k => k.includes('network.proxy.')))) {
      setProxy()
    }
  })
}

export * from './main'
export * from './rendererEvent'

