/**
 * index.ts
 * 主进程工具函数集合
 * 提供应用程序各种实用工具函数，包括环境参数解析、设置管理、热键配置、主题管理和电源管理等功能
 */

import { encodePath, isUrl, throttle } from '@common/utils'
import migrateSetting from '@common/utils/migrateSetting'
import getStore from '@main/utils/store'
import { STORE_NAMES, URL_SCHEME_RXP } from '@common/constants'
import defaultSetting from '@common/defaultSetting'
import defaultHotKey from '@common/defaultHotKey'
import { migrateDataJson, migrateHotKey, migrateUserApi, parseDataFile } from './migrate'
import { nativeTheme, powerSaveBlocker } from 'electron'
import { joinPath } from '@common/utils/nodejs'
import themes from '@common/theme/index.json'

/**
 * 解析命令行参数和深度链接
 * 处理应用启动时传入的命令行参数和URL Scheme链接
 * @returns 包含命令行参数和深度链接的对象
 */
export const parseEnvParams = (): { cmdParams: LX.CmdParams, deeplink: string | null } => {
  // 初始化命令行参数对象
  const cmdParams: LX.CmdParams = {}
  // 初始化深度链接为null
  let deeplink = null
  // 定义命令行参数正则表达式，匹配以-开头的参数
  const rx = /^-\w+/
  // 遍历进程的命令行参数
  for (let param of process.argv) {
    // 检查参数是否匹配URL协议格式，如果是则设置为深度链接
    if (URL_SCHEME_RXP.test(param)) {
      deeplink = param
    }

    // 如果参数不是以-开头的格式，跳过处理
    if (!rx.test(param)) continue
    // 移除参数开头的-符号
    param = param.substring(1)
    // 查找参数中是否包含=号
    let index = param.indexOf('=')
    if (index < 0) {
      // 如果没有=号，将参数值设为true
      cmdParams[param] = true
    } else {
      // 如果有=号，分割参数名和参数值
      cmdParams[param.substring(0, index)] = param.substring(index + 1)
    }
  }
  // 返回解析后的命令行参数和深度链接
  return {
    cmdParams,
    deeplink,
  }
}

/**
 * 定义基本数据类型列表
 */
const primitiveType = ['string', 'boolean', 'number']

/**
 * 检查值是否为基本数据类型
 * @param val - 要检查的值
 * @returns 如果是基本数据类型或null则返回true，否则返回false
 */
const checkPrimitiveType = (val: any): boolean => val === null || primitiveType.includes(typeof val)
// const handleMergeSetting = (defaultSetting: LX.AppSetting, currentSetting: Partial<LX.AppSetting>) => {
//   const updatedSettingKeys: Array<keyof LX.AppSetting> = []
//   for (const key of Object.keys(defaultSetting) as Array<keyof LX.AppSetting>) {
//     const currentValue: any = currentSetting[key]
//     const isPrimitive = checkPrimitiveType(currentValue)
//     // if (checkPrimitiveType(value)) {
//     if (!isPrimitive) continue
//     updatedSettingKeys.push(key)
//     // @ts-expect-error
//     defaultSetting[key] = currentValue
//     // } else {
//     //   if (!isPrimitive && currentValue != undefined) handleMergeSetting(value, currentValue)
//     // }
//   }
//   return {
//     setting: defaultSetting,
//     updatedSettingKeys,
//   }
// }

/**
 * 合并应用设置
 * 将目标设置合并到原始设置中，并跟踪已更新的设置项
 * @param originSetting - 原始设置对象
 * @param targetSetting - 要合并的目标设置对象
 * @returns 包含合并后的设置、已更新的设置键和更新的设置值的对象
 */
export const mergeSetting = (originSetting: LX.AppSetting, targetSetting?: Partial<LX.AppSetting> | null): {
  setting: LX.AppSetting
  updatedSettingKeys: Array<keyof LX.AppSetting>
  updatedSetting: Partial<LX.AppSetting>
} => {
  // 创建原始设置的浅拷贝，避免修改原始对象
  let originSettingCopy: LX.AppSetting = { ...originSetting }
  // const defaultVersion = targetSettingCopy.version
  // 初始化已更新的设置键数组
  const updatedSettingKeys: Array<keyof LX.AppSetting> = []
  // 初始化已更新的设置值对象
  const updatedSetting: Partial<LX.AppSetting> = {}

  if (targetSetting) {
    // 获取原始设置和目标设置的所有键
    const originSettingKeys = Object.keys(originSettingCopy)
    const targetSettingKeys = Object.keys(targetSetting)

    // 根据键数量选择不同的遍历策略，优化性能
    if (originSettingKeys.length > targetSettingKeys.length) {
      // 如果原始设置键更多，遍历目标设置键
      for (const key of targetSettingKeys as Array<keyof LX.AppSetting>) {
        const targetValue: any = targetSetting[key]
        // 检查值是否为基本数据类型
        const isPrimitive = checkPrimitiveType(targetValue)
        // 跳过非基本类型、值相同或原始设置中不存在的键
        if (!isPrimitive || targetValue == originSettingCopy[key] || originSettingCopy[key] === undefined) continue
        // 记录已更新的键
        updatedSettingKeys.push(key)
        // 记录已更新的值
        updatedSetting[key] = targetValue
        // 更新原始设置副本中的值
        // @ts-expect-error
        originSettingCopy[key] = targetValue
      }
    } else {
      // 如果目标设置键更多或相等，遍历原始设置键
      for (const key of originSettingKeys as Array<keyof LX.AppSetting>) {
        const targetValue: any = targetSetting[key]
        // 检查值是否为基本数据类型
        const isPrimitive = checkPrimitiveType(targetValue)
        // 跳过非基本类型或值相同的键
        if (!isPrimitive || targetValue == originSettingCopy[key]) continue
        // 记录已更新的键
        updatedSettingKeys.push(key)
        // 记录已更新的值
        updatedSetting[key] = targetValue
        // 更新原始设置副本中的值
        // @ts-expect-error
        originSettingCopy[key] = targetValue
      }
    }
  }

  // 返回合并后的设置、已更新的键和值
  return {
    setting: originSettingCopy,
    updatedSettingKeys,
    updatedSetting,
  }
}


/**
 * 更新应用设置
 * 更新全局设置并保存到配置存储中
 * @param setting - 要更新的设置对象
 * @param isInit - 是否为初始化阶段，默认为false
 * @returns 更新结果，包含更新后的设置和已更新的设置键
 */
export const updateSetting = (setting?: Partial<LX.AppSetting>, isInit: boolean = false) => {
  // 获取应用设置存储实例
  const electronStore_config = getStore(STORE_NAMES.APP_SETTINGS)

  let originSetting: LX.AppSetting
  if (isInit) {
    // 初始化阶段：如果提供了设置，先进行迁移处理以确保兼容性
    setting &&= migrateSetting(setting)
    // 使用默认设置作为基础
    originSetting = { ...defaultSetting }
  } else originSetting = global.lx.appSetting // 非初始化阶段：使用当前全局设置

  // 合并设置并获取结果
  const result = mergeSetting(originSetting, setting)

  // 确保版本号与默认设置一致
  result.setting.version = defaultSetting.version

  // 将更新后的设置保存到存储中
  electronStore_config.override({ version: result.setting.version, setting: result.setting })
  return result
}

/**
 * 初始化应用设置
 * 从配置文件加载设置，如果不存在则尝试从旧版本迁移设置
 * @returns 初始化后的设置结果
 */
export const initSetting = async() => {
  // 获取应用设置存储实例
  const electronStore_config = getStore(STORE_NAMES.APP_SETTINGS)

  // 尝试从存储中获取设置
  let setting = electronStore_config.get('setting') as LX.AppSetting | undefined

  // 如果设置不存在，尝试从旧版本配置文件迁移
  if (!setting) {
    // 解析旧版本配置文件
    const config = await parseDataFile<{ setting?: any }>('config.json')
    // 如果找到旧设置，使用它
    if (config?.setting) setting = config.setting as LX.AppSetting
    // 迁移用户API配置
    await migrateUserApi()
    // 迁移数据JSON文件
    await migrateDataJson()
  }

  // 更新设置并标记为初始化阶段
  return updateSetting(setting, true)
}

/**
 * 初始化快捷键设置
 * 从配置文件加载快捷键设置，如果不存在则尝试从旧版本迁移或使用默认设置
 * @returns 包含本地和全局快捷键配置的对象
 */
export const initHotKey = async() => {
  // 获取热键设置存储实例
  const electronStore_hotKey = getStore(STORE_NAMES.HOTKEY)

  // 尝试从存储中获取本地和全局热键配置
  let localConfig = electronStore_hotKey.get('local') as LX.HotKeyConfig | null
  let globalConfig = electronStore_hotKey.get('global') as LX.HotKeyConfig | null

  if (globalConfig) {
    // 如果全局配置存在，检查并移除旧版本的媒体快捷键
    // 移除v2.2.0及之前设置的全局媒体快捷键注册
    if (globalConfig.keys.MediaPlayPause) {
      // 删除不再支持的媒体快捷键
      delete globalConfig.keys.MediaPlayPause
      delete globalConfig.keys.MediaNextTrack
      delete globalConfig.keys.MediaPreviousTrack
      // 保存更新后的全局配置
      electronStore_hotKey.set('global', globalConfig)
    }
  } else {
    // 如果全局配置不存在，尝试从旧版本迁移热键配置
    const config = await migrateHotKey()
    if (config) {
      // 如果迁移成功，使用迁移的配置
      localConfig = config.local
      globalConfig = config.global
    } else {
      // 如果没有可迁移的配置，使用默认配置
      // 使用深拷贝避免修改默认配置
      localConfig = JSON.parse(JSON.stringify(defaultHotKey.local))
      globalConfig = JSON.parse(JSON.stringify(defaultHotKey.global))
    }

    // 保存配置到存储中
    electronStore_hotKey.set('local', localConfig)
    electronStore_hotKey.set('global', globalConfig)
  }

  // 返回初始化后的热键配置
  return {
    local: localConfig!,
    global: globalConfig!,
  }
}
/**
 * 热键类型定义
 */
type HotKeyType = 'local' | 'global'

/**
 * 保存热键配置的节流函数
 * 防止频繁保存操作导致性能问题
 * @param config - 要保存的热键配置
 */
const saveHotKeyConfig = throttle<[LX.HotKeyConfigAll]>((config: LX.HotKeyConfigAll) => {
  for (const key of Object.keys(config) as HotKeyType[]) {
    global.lx.hotKey.config[key] = config[key]
    getStore(STORE_NAMES.HOTKEY).set(key, config[key])
  }
})
/**
 * 保存应用热键配置
 * @param config - 要保存的热键配置对象
 */
export const saveAppHotKeyConfig = (config: LX.HotKeyConfigAll) => {
  saveHotKeyConfig(config)
}

/**
 * 打开开发者工具
 * @param webContents - Electron的WebContents对象
 */
export const openDevTools = (webContents: Electron.WebContents) => {
  webContents.openDevTools({
    mode: 'undocked',
  })
}


/**
 * 用户自定义主题列表
 */
let userThemes: LX.Theme[]

/**
 * 获取所有主题
 * 包括内置主题和用户自定义主题
 * @returns 包含所有主题和主题图片路径的对象
 */
export const getAllThemes = () => {
  userThemes ??= getStore(STORE_NAMES.THEME).get('themes') as (LX.Theme[] | null) ?? []
  return {
    themes,
    userThemes,
    dataPath: joinPath(global.lxDataPath, 'theme_images'),
  }
}

/**
 * 保存主题
 * 如果主题已存在则更新，否则添加到用户主题列表
 * @param theme - 要保存的主题对象
 */
export const saveTheme = (theme: LX.Theme) => {
  const targetTheme = userThemes.find(t => t.id === theme.id)
  if (targetTheme) Object.assign(targetTheme, theme)
  else userThemes.push(theme)
  getStore(STORE_NAMES.THEME).set('themes', userThemes)
}

/**
 * 移除主题
 * 根据主题ID从用户主题列表中删除主题
 * @param id - 要移除的主题ID
 */
export const removeTheme = (id: string) => {
  const index = userThemes.findIndex(t => t.id === id)
  if (index < 0) return
  userThemes.splice(index, 1)
  getStore(STORE_NAMES.THEME).set('themes', userThemes)
}

/**
 * 复制主题对象
 * 创建主题对象的深拷贝，避免修改原始对象
 * @param theme - 要复制的主题对象
 * @returns 复制后的主题对象
 */
const copyTheme = (theme: LX.Theme): LX.Theme => {
  return {
    ...theme,
    config: {
      ...theme.config,
      extInfo: { ...theme.config.extInfo },
      themeColors: { ...theme.config.themeColors },
    },
  }
}
/**
 * 获取当前主题
 * 根据应用设置和系统暗色模式状态确定当前使用的主题
 * @returns 包含当前主题信息和系统暗色模式状态的对象
 */
export const getTheme = () => {
  // fs.promises.readdir()
  const shouldUseDarkColors = nativeTheme.shouldUseDarkColors
  let themeId = global.lx.appSetting['theme.id'] == 'auto'
    ? shouldUseDarkColors
      ? global.lx.appSetting['theme.darkId']
      : global.lx.appSetting['theme.lightId']
    : global.lx.appSetting['theme.id']
  // themeId = 'naruto'
  // themeId = 'pink'
  // themeId = 'black'
  let theme = themes.find(theme => theme.id == themeId)
  if (!theme) {
    userThemes = getStore(STORE_NAMES.THEME).get('themes') as LX.Theme[] | null ?? []
    theme = userThemes.find(theme => theme.id == themeId)
    if (theme) {
      if (theme.config.extInfo['--background-image'] != 'none') {
        theme = copyTheme(theme)
        theme.config.extInfo['--background-image'] =
          isUrl(theme.config.extInfo['--background-image'])
            ? `url(${theme.config.extInfo['--background-image']})`
            : `url(file:///${encodePath(joinPath(global.lxDataPath, 'theme_images', theme.config.extInfo['--background-image']))})`
      }
    } else {
      themeId = global.lx.appSetting['theme.id'] == 'auto' && shouldUseDarkColors ? 'black' : 'green'
      theme = themes.find(theme => theme.id == themeId) as LX.Theme
    }
  }

  const colors: Record<string, string> = {
    ...theme.config.themeColors,
    ...theme.config.extInfo,
  }

  return {
    shouldUseDarkColors,
    theme: {
      id: global.lx.appSetting['theme.id'],
      name: theme.name,
      isDark: theme.isDark,
      isDarkFont: theme.isDarkFont,
      colors,
    },
  }
}

/**
 * 电源节能阻止器ID
 */
let powerSaveBlockerId: number | null = null

/**
 * 设置电源节能阻止器
 * 控制应用是否阻止系统进入节能模式
 * @param enabled - 是否启用电源节能阻止器
 */
export const setPowerSaveBlocker = (enabled: boolean) => {
  // 检查当前电源节能阻止器是否已启用
  let isEnabled = powerSaveBlockerId != null && powerSaveBlocker.isStarted(powerSaveBlockerId)
  
  if (enabled) {
    // 如果要启用阻止器但已经启用，则无需操作
    if (isEnabled) return
    // 启动电源节能阻止器，防止应用挂起
    powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension')
  } else {
    // 如果要禁用阻止器但已经禁用，则无需操作
    if (!isEnabled) return
    // 停止电源节能阻止器
    powerSaveBlocker.stop(powerSaveBlockerId!)
    // 重置阻止器ID
    powerSaveBlockerId = null
  }
}


/**
 * 环境代理配置
 */
let envProxy: null | { host: string, port: number } = null

/**
 * 获取代理设置
 * 根据应用设置或环境参数获取代理配置
 * @returns 代理配置对象或null
 */
/**
 * 获取代理设置
 * 根据应用设置或环境参数获取代理配置
 * @returns 代理配置对象或null
 */
export const getProxy = () => {
  // 首先检查应用设置中的代理配置
  if (global.lx.appSetting['network.proxy.enable'] && global.lx.appSetting['network.proxy.host']) {
    // 如果应用设置中启用了代理并设置了主机，返回应用设置中的代理配置
    return {
      host: global.lx.appSetting['network.proxy.host'],
      port: parseInt(global.lx.appSetting['network.proxy.port'] || '80'), // 如果未设置端口，默认使用80
    }
  }
  // 然后检查缓存的环境代理配置
  if (envProxy) {
    // 如果已有缓存的环境代理配置，直接返回
    return {
      host: envProxy.host,
      port: envProxy.port,
    }
  } else {
    // 最后尝试从命令行参数中获取代理配置
    const envProxyStr = envParams.cmdParams['proxy-server']
    if (envProxyStr && typeof envProxyStr == 'string') {
      // 解析命令行参数中的代理字符串，格式为 host:port
      const [host, port = ''] = envProxyStr.split(':')
      // 缓存并返回解析后的代理配置
      return envProxy = {
        host,
        port: parseInt(port || '80'), // 如果未指定端口，默认使用80
      }
    }
  }

  // 如果没有找到任何代理配置，返回null
  return null
}
