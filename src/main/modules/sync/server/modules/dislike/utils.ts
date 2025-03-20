import { SPLIT_CHAR } from '@common/constants'

/**
 * 不喜欢列表规则处理工具模块
 * 提供对不喜欢列表规则的格式化、过滤和处理功能
 * 规则格式支持：
 * 1. 完整规则：歌名${SPLIT_CHAR.DISLIKE_NAME}歌手
 * 2. 仅歌名规则：歌名
 * 3. 仅歌手规则：${SPLIT_CHAR.DISLIKE_NAME}歌手
 */

/**
 * 过滤和格式化不喜欢规则列表
 * @param rules - 原始规则字符串，每行一条规则
 * @returns 处理后的规则集合，包含格式化后的唯一规则
 * 
 * 处理流程：
 * 1. 按行分割规则字符串
 * 2. 对每行规则进行解析和格式化：
 *    - 转换为小写
 *    - 去除首尾空格
 *    - 替换特殊分隔符
 * 3. 根据规则类型（完整/仅歌名/仅歌手）进行相应处理
 * 4. 返回去重后的规则集合
 */
export const filterRules = (rules: string) => {
  const list: string[] = []
  for (const item of rules.split('\n')) {
    if (!item) continue
    let [name, singer] = item.split(SPLIT_CHAR.DISLIKE_NAME)
    if (name) {
      name = name.replaceAll(SPLIT_CHAR.DISLIKE_NAME, SPLIT_CHAR.DISLIKE_NAME_ALIAS).toLocaleLowerCase().trim()
      if (singer) {
        singer = singer.replaceAll(SPLIT_CHAR.DISLIKE_NAME, SPLIT_CHAR.DISLIKE_NAME_ALIAS).toLocaleLowerCase().trim()
        list.push(`${name}${SPLIT_CHAR.DISLIKE_NAME}${singer}`)
      } else {
        list.push(name)
      }
    } else if (singer) {
      singer = singer.replaceAll(SPLIT_CHAR.DISLIKE_NAME, SPLIT_CHAR.DISLIKE_NAME_ALIAS).toLocaleLowerCase().trim()
      list.push(`${SPLIT_CHAR.DISLIKE_NAME}${singer}`)
    }
  }
  return new Set(list)
}
