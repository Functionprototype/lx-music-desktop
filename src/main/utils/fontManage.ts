/**
 * fontManage.ts
 * 字体管理工具模块
 * 负责获取系统可用字体列表，为应用提供字体选择功能
 */

// const { getAvailableFontFamilies } = require('electron-font-manager')


// exports.getAvailableFontFamilies = getAvailableFontFamilies

import { getFonts } from 'font-list'
// import { getAvailableFontFamilies } from 'electron-font-manager'


// const getFonts = async() => {
//   switch (process.platform) {
//     case 'win32':
//     case 'darwin':
//       return getAvailableFontFamilies()
//     default: return getFontsByCommand()
//   }
// }

export {
  getFonts,
}
