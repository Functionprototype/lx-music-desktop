/**
 * userApi/utils.ts
 * 用户自定义API工具模块
 * 负责用户API的存储、解析、压缩/解压缩和管理功能
 */

import { userApis as defaultUserApis } from './config'
import { STORE_NAMES } from '@common/constants'
import getStore from '@main/utils/store'
import zlib from 'node:zlib'

// 用户API列表缓存
let userApis: LX.UserApi.UserApiInfo[] | null
// 用户API脚本内容映射表，使用Map提高访问效率
let scripts = new Map<string, string>()

/**
 * 保存用户API数据到存储
 * 将内存中的API信息和脚本内容保存到electron-store
 */
const saveData = () => {
  getStore(STORE_NAMES.USER_API).set('userApis', userApis!.map(api => {
    return {
      ...api,
      script: scripts.get(api.id),
    }
  }))
}

/**
 * 获取所有用户API信息
 * 从存储中加载API信息，如果不存在则使用默认配置
 * @returns 用户API信息列表
 */
export const getUserApis = (): LX.UserApi.UserApiInfo[] => {
  if (userApis) return userApis

  const electronStore_userApi = getStore(STORE_NAMES.USER_API)
  let infoFull = electronStore_userApi.get('userApis') as LX.UserApi.UserApiInfoFull[]
  let requiredUpdate = false
  if (infoFull) {
    for (let i = 0; i < infoFull.length; i++) {
      const api = infoFull[i]
      if (api.version != null) continue
      requiredUpdate ||= true
      try {
        infoFull.splice(i, 1, {
          ...parseScriptInfo(api.script),
          ...api,
        })
      } catch (e) {
        infoFull.splice(i, 1)
        i--
      }
    }
  } else {
    infoFull = defaultUserApis
    electronStore_userApi.set('userApis', userApis)
  }
  userApis = infoFull.map(api => {
    if (api.allowShowUpdateAlert == null) api.allowShowUpdateAlert = false
    const { script, ...info } = api
    scripts.set(api.id, script)
    return info
  })
  if (requiredUpdate) saveData()
  return userApis
}

// API信息字段名称及其最大长度限制
const INFO_NAMES = {
  name: 24,
  description: 36,
  author: 56,
  homepage: 1024,
  version: 36,
} as const
type INFO_NAMES_Type = typeof INFO_NAMES

/**
 * 从脚本注释中提取API信息
 * 解析脚本头部注释中的元数据信息
 * @param scriptInfo 脚本注释文本
 * @returns 解析后的API信息对象
 */
const matchInfo = (scriptInfo: string) => {
  const infoArr = scriptInfo.split(/\r?\n/)
  const rxp = /^\s?\*\s?@(\w+)\s(.+)$/
  const infos: Partial<Record<keyof typeof INFO_NAMES, string>> = {}
  for (const info of infoArr) {
    const result = rxp.exec(info)
    if (!result) continue
    const key = result[1] as keyof typeof INFO_NAMES
    if (INFO_NAMES[key] == null) continue
    infos[key] = result[2].trim()
  }

  // 处理字段长度限制，确保不超过最大长度
  for (const [key, len] of Object.entries(INFO_NAMES) as Array<{ [K in keyof INFO_NAMES_Type]: [K, INFO_NAMES_Type[K]] }[keyof INFO_NAMES_Type]>) {
    infos[key] ||= ''
    if (infos[key] == null) infos[key] = ''
    else if (infos[key].length > len) infos[key] = infos[key].substring(0, len) + '...'
  }

  return infos as Record<keyof typeof INFO_NAMES, string>
}

/**
 * 解析脚本信息
 * 从脚本内容中提取头部注释并解析API信息
 * @param script 完整的脚本内容
 * @returns 解析后的API信息
 */
const parseScriptInfo = (script: string) => {
  const result = /^\/\*[\S|\s]+?\*\//.exec(script)
  if (!result) throw new Error('无效的自定义源文件')

  let scriptInfo = matchInfo(result[0])

  // 如果没有名称，则生成默认名称
  scriptInfo.name ||= `user_api_${new Date().toLocaleString()}`
  return scriptInfo
}

/**
 * 压缩脚本内容
 * 使用zlib将脚本内容压缩为base64字符串
 * @param script 原始脚本内容
 * @returns 压缩后的脚本内容
 */
const deflateScript = async(script: string) => new Promise<string>((resolve, reject) => {
  zlib.deflate(Buffer.from(script, 'utf8'), (err, buf) => {
    if (err) {
      reject(err)
      return
    }
    resolve('gz_' + buf.toString('base64'))
  })
})

/**
 * 解压缩脚本内容
 * 将压缩的脚本内容解压缩为原始文本
 * @param script 压缩的脚本内容
 * @returns 解压后的原始脚本内容
 */
const inflateScript = async(script: string) => new Promise<string>((resolve, reject) => {
  if (script.startsWith('gz_')) {
    zlib.inflate(Buffer.from(script.substring(3), 'base64'), (err, buf) => {
      if (err) {
        reject(err)
        return
      }
      resolve(buf.toString('utf8'))
    })
  } else resolve(script)
})

/**
 * 导入用户API
 * 解析脚本内容，创建API信息对象并保存
 * @param scriptRaw 原始脚本内容
 * @returns 创建的API信息对象
 */
export const importApi = async(scriptRaw: string): Promise<LX.UserApi.UserApiInfo> => {
  let scriptInfo = parseScriptInfo(scriptRaw)
  const apiInfo = {
    id: `user_api_${Math.random().toString().substring(2, 5)}_${Date.now()}`,
    ...scriptInfo,
    allowShowUpdateAlert: true,
  }
  userApis ??= []
  userApis.push(apiInfo)
  const script = await deflateScript(scriptRaw)
  scripts.set(apiInfo.id, script)
  saveData()
  return apiInfo
}

/**
 * 移除指定的用户API
 * 从内存和存储中删除指定ID的API
 * @param ids 要删除的API ID数组
 */
export const removeApi = (ids: string[]) => {
  if (!userApis) return
  for (let index = userApis.length - 1; index > -1; index--) {
    if (ids.includes(userApis[index].id)) {
      scripts.delete(userApis[index].id)
      userApis.splice(index, 1)
      ids.splice(index, 1)
    }
  }
  saveData()
}

/**
 * 设置是否允许显示API更新提醒
 * @param id API的唯一标识
 * @param enable 是否启用更新提醒
 */
export const setAllowShowUpdateAlert = (id: string, enable: boolean) => {
  const targetApi = userApis?.find(api => api.id == id)
  if (!targetApi) return
  targetApi.allowShowUpdateAlert = enable
  saveData()
}

/**
 * 获取指定ID的API脚本内容
 * 从缓存中获取脚本内容并解压
 * @param id API的唯一标识
 * @returns 解压后的脚本内容
 */
export const getScript = async(id: string) => {
  return inflateScript(scripts.get(id) ?? '')
}
