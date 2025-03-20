/**
 * userApi/rendererEvent/name.js
 * 用户自定义API事件名称定义模块
 * 定义主进程和渲染进程之间通信的事件名称常量
 */

// 事件名称映射对象，初始值为空字符串
const names = {
  initEnv: '',      // 初始化环境事件
  init: '',         // 初始化完成事件
  request: '',      // 请求事件
  response: '',     // 响应事件
  openDevTools: '', // 打开开发者工具事件
  showUpdateAlert: '', // 显示更新提醒事件
  getProxy: '',     // 获取代理设置事件
  proxyUpdate: '',  // 代理设置更新事件
}

// 为每个事件名称添加前缀，确保唯一性
for (const key of Object.keys(names)) {
  names[key] = `userApi_${key}`
}

// 导出事件名称常量对象
export default names
