/**
 * index-dev.ts
 * 开发环境专用入口文件
 * 负责安装开发工具（electron-debug和vue-devtools）并配置开发环境
 * 通常不需要修改此文件，但可以用于扩展开发环境功能
 */

import { app } from 'electron'
import electronDebug from 'electron-debug' // 导入electron调试工具
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer' // 导入Vue开发者工具
import { openDevTools } from './utils' // 导入开发者工具打开函数

// 安装electron-debug工具（包含devtron）
// 配置为不自动显示开发者工具，使用独立窗口模式
electronDebug({
  showDevTools: false,  // 不自动显示开发者工具
  devToolsMode: 'undocked', // 使用独立窗口模式
})

// 应用就绪后安装Vue开发者工具
app.on('ready', () => {
  // 监听主窗口创建事件
  global.lx.event_app.on('main_window_created', (win) => {
    // 打开开发者工具
    openDevTools(win.webContents)
    // 为主窗口安装Vue开发者工具
    installExtension(VUEJS_DEVTOOLS, { session: win.webContents.session })
      .then((name: string) => {
        console.log(`[main window] Added Extension:  ${name}`)
      })
      .catch((err: Error) => {
        console.log('[main window] An error occurred: ', err)
      })
  })
  
  // 监听桌面歌词窗口创建事件
  global.lx.event_app.on('desktop_lyric_window_created', (win) => {
    // 打开开发者工具
    openDevTools(win.webContents)
    // 为歌词窗口安装Vue开发者工具
    installExtension(VUEJS_DEVTOOLS, { session: win.webContents.session })
      .then((name: string) => {
        console.log(`[lyric window] Added Extension:  ${name}`)
      })
      .catch((err: Error) => {
        console.log('[lyric window] An error occurred: ', err)
      })
  })
})

// 引入主进程启动应用
require('./index')

