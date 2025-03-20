// import type Database from 'better-sqlite3'
import { getDB } from '../../db'
import {
  createQueryStatement,
  createInsertStatement,
  // createDeleteStatement,
  // createUpdateStatement,
  createClearStatement,
} from './statements'

/**
 * 不喜欢列表数据库操作模块
 * 提供对不喜欢列表的增删改查等基本数据库操作
 */

/**
 * 查询不喜欢歌曲列表
 * @returns 返回不喜欢列表的所有规则信息
 */
export const queryDislikeList = () => {
  const queryStatement = createQueryStatement()
  return queryStatement.all() as LX.DBService.DislikeInfo[]
}

/**
 * 批量插入不喜欢歌曲规则
 * @param infos 规则列表，每个规则包含歌曲名和歌手名的组合
 * @returns Promise 异步操作完成的Promise
 */
export const insertDislikeList = async(infos: LX.DBService.DislikeInfo[]) => {
  const db = getDB()
  const insertStatement = createInsertStatement()
  db.transaction((infos: LX.DBService.DislikeInfo[]) => {
    for (const info of infos) insertStatement.run(info)
  })(infos)
}

/**
 * 覆盖并批量插入不喜欢歌曲规则
 * 该操作会先清空现有的所有规则，然后插入新的规则列表
 * @param infos 新的规则列表，每个规则包含歌曲名和歌手名的组合
 * @returns Promise 异步操作完成的Promise
 */
export const overwirteDislikeList = async(infos: LX.DBService.DislikeInfo[]) => {
  const db = getDB()
  const clearStatement = createClearStatement()
  const insertStatement = createInsertStatement()
  db.transaction((infos: LX.DBService.DislikeInfo[]) => {
    clearStatement.run()
    for (const info of infos) insertStatement.run(info)
  })(infos)
}

// /**
//  * 批量删除不喜欢歌曲
//  * @param ids 列表
//  */
// export const deleteDislikeList = (ids: string[]) => {
//   const db = getDB()
//   const deleteStatement = createDeleteStatement()
//   db.transaction((ids: string[]) => {
//     for (const id of ids) deleteStatement.run(BigInt(id))
//   })(ids)
// }

// /**
//  * 批量更新不喜欢歌曲规则
//  * @param infos 规则列表，每个规则包含歌曲名和歌手名的组合
//  * @returns Promise 异步操作完成的Promise
//  */
// export const updateDislikeList = async(infos: LX.DBService.DislikeInfo[]) => {
//   const db = getDB()
//   const updateStatement = createUpdateStatement()
//   db.transaction((infos: LX.DBService.DislikeInfo[]) => {
//     for (const info of infos) updateStatement.run(info)
//   })(infos)
// }

// /**
//  * 清空不喜欢歌曲列表
//  * 删除数据库中所有的不喜欢规则
//  */
// export const clearDislikeList = () => {
//   const clearStatement = createClearStatement()
//   clearStatement.run()
// }

