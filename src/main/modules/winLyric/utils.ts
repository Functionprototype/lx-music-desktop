/**
 * @file 桌面歌词工具函数模块
 * @description 提供桌面歌词窗口相关的工具函数，处理窗口大小、位置和配置
 */

// 设置窗口最小尺寸限制
export let minWidth = 80 // 最小宽度（像素）
export let minHeight = 50 // 最小高度（像素）


// const updateBounds = (bounds: Bounds) => {
//   bounds.x = bounds.x
//   return bounds
// }

/**
 * 计算桌面歌词窗口的边界
 * @description 根据当前窗口边界和新的相对位置/大小，计算新的窗口边界，并处理屏幕边界限制
 * @param bounds 当前窗口边界
 * @param param 新的相对位置和大小参数
 * @returns 计算后的窗口边界
 */
export const getLyricWindowBounds = (bounds: Electron.Rectangle, { x = 0, y = 0, w = 0, h = 0 }: LX.DesktopLyric.NewBounds): Electron.Rectangle => {
  // 确保窗口尺寸不小于最小限制
  if (w < minWidth) w = minWidth
  if (h < minHeight) h = minHeight

  // 如果启用了锁定屏幕功能，确保窗口不会超出屏幕边界
  if (global.lx.appSetting['desktopLyric.isLockScreen']) {
    if (!global.envParams.workAreaSize) return bounds
    const maxWinW = global.envParams.workAreaSize.width
    const maxWinH = global.envParams.workAreaSize.height

    // 限制窗口最大尺寸不超过屏幕
    if (w > maxWinW) w = maxWinW
    if (h > maxWinH) h = maxWinH

    // 计算窗口可移动的最大坐标
    const maxX = global.envParams.workAreaSize.width - w
    const maxY = global.envParams.workAreaSize.height - h

    // 计算新的绝对坐标
    x += bounds.x
    y += bounds.y

    // 确保窗口不会超出屏幕边界
    if (x > maxX) x = maxX
    else if (x < 0) x = 0

    if (y > maxY) y = maxY
    else if (y < 0) y = 0
  } else {
    // 如果未启用锁定屏幕，直接计算新的绝对坐标
    y += bounds.y
    x += bounds.x
  }

  // console.log('util bounds', bounds)
  return { width: w, height: h, x, y }
}


/**
 * 需要监听变化的配置键列表
 * @description 这些配置键的变化会影响桌面歌词窗口的显示和行为
 */
export const watchConfigKeys = [
  'desktopLyric.enable',          // 是否启用桌面歌词
  'desktopLyric.isLock',          // 是否锁定桌面歌词
  'desktopLyric.isAlwaysOnTop',   // 是否置顶显示
  'desktopLyric.isAlwaysOnTopLoop', // 是否循环刷新置顶状态
  'desktopLyric.isShowTaskbar',   // 是否在任务栏显示
  'desktopLyric.audioVisualization', // 是否启用音频可视化
  'desktopLyric.width',           // 窗口宽度
  'desktopLyric.height',          // 窗口高度
  'desktopLyric.x',               // 窗口X坐标
  'desktopLyric.y',               // 窗口Y坐标
  'desktopLyric.isLockScreen',    // 是否锁定在屏幕内
  'desktopLyric.isDelayScroll',   // 是否延迟滚动歌词
  'desktopLyric.scrollAlign',     // 歌词滚动对齐方式
  'desktopLyric.isHoverHide',     // 鼠标悬停时是否降低透明度
  'desktopLyric.direction',       // 歌词显示方向
  'desktopLyric.style.align',     // 歌词对齐方式
  'desktopLyric.style.lyricUnplayColor', // 未播放歌词颜色
  'desktopLyric.style.lyricPlayedColor', // 已播放歌词颜色
  'desktopLyric.style.lyricShadowColor', // 歌词阴影颜色
  'desktopLyric.style.font',      // 歌词字体
  'desktopLyric.style.fontSize',  // 歌词字体大小
  'desktopLyric.style.lineGap',   // 歌词行间距
  // 'desktopLyric.style.fontWeight', // 歌词字体粗细
  'desktopLyric.style.opacity',   // 歌词透明度
  'desktopLyric.style.ellipsis',  // 是否不允许歌词换行
  'desktopLyric.style.isFontWeightFont', // 是否加粗原文歌词
  'desktopLyric.style.isFontWeightLine', // 是否加粗逐行歌词
  'desktopLyric.style.isFontWeightExtended', // 是否加粗翻译和音译歌词
  'desktopLyric.style.isZoomActiveLrc', // 是否放大当前播放行
  'common.langId',                // 语言ID
  'player.isShowLyricTranslation', // 是否显示歌词翻译
  'player.isShowLyricRoma',       // 是否显示歌词音译
  'player.isPlayLxlrc',           // 是否播放逐行歌词
  'player.playbackRate',          // 播放速率
] as const

/**
 * 构建桌面歌词配置对象
 * @description 从应用设置中提取桌面歌词相关的配置项
 * @param appSetting 应用设置对象
 * @returns 桌面歌词配置对象
 */
export const buildLyricConfig = (appSetting: Partial<LX.AppSetting>): Partial<LX.DesktopLyric.Config> => {
  const setting: Partial<LX.DesktopLyric.Config> = {}
  for (const key of watchConfigKeys) {
    // @ts-expect-error
    if (key in appSetting) setting[key] = appSetting[key]
  }
  return setting
}

/**
 * 初始化窗口大小和位置
 * @description 根据配置初始化桌面歌词窗口的大小和位置，确保窗口在屏幕范围内
 * @param x 窗口X坐标
 * @param y 窗口Y坐标
 * @param width 窗口宽度
 * @param height 窗口高度
 * @returns 初始化后的窗口位置和大小
 */
export const initWindowSize = (x: LX.AppSetting['desktopLyric.x'], y: LX.AppSetting['desktopLyric.y'], width: LX.AppSetting['desktopLyric.width'], height: LX.AppSetting['desktopLyric.height']) => {
  if (x == null || y == null) {
    // 如果没有指定位置，则设置默认位置和大小
    if (width < minWidth) width = minWidth
    if (height < minHeight) height = minHeight
    if (global.envParams.workAreaSize) {
      // 默认放置在屏幕右下角
      x = global.envParams.workAreaSize.width - width
      y = global.envParams.workAreaSize.height - height
    } else {
      // 如果无法获取工作区大小，则放置在左上角
      x = y = 0
    }
  } else {
    // 如果指定了位置，则确保窗口在屏幕范围内
    let bounds = getLyricWindowBounds({ x, y, width, height }, { x: 0, y: 0, w: width, h: height })
    x = bounds.x
    y = bounds.y
    width = bounds.width
    height = bounds.height
  }
  return {
    x,
    y,
    width,
    height,
  }
}
