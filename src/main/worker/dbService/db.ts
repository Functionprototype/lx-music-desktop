/**
 * @file 数据库服务模块 - 负责SQLite数据库的初始化、连接和管理
 * @description 使用better-sqlite3提供数据库功能，包括数据库连接创建、表初始化、数据迁移和验证
 */

import Database from 'better-sqlite3'
import path from 'path'
import tables, { DB_VERSION } from './tables' // 导入表结构定义和数据库版本号
import verifyDB from './verifyDB' // 导入数据库验证功能
import migrateData from './migrate' // 导入数据库迁移功能

/**
 * 全局数据库连接实例
 * @type {Database.Database}
 */
let db: Database.Database


/**
 * 初始化数据库表结构
 * @param {Database.Database} db - 数据库连接实例
 * @description 创建所有必要的数据库表并设置数据库版本信息
 */
const initTables = (db: Database.Database) => {
  // 执行所有表创建SQL语句，并插入数据库版本信息
  db.exec(`
    ${Array.from(tables.values()).join('\n')}
    INSERT INTO "main"."db_info" ("field_name", "field_value") VALUES ('version', '${DB_VERSION}');
  `)
}


/**
 * 打开并初始化数据库
 * @param {string} lxDataPath - 应用数据存储路径
 * @returns {boolean | null} - 返回数据库文件是否已存在，如果验证失败则返回null
 * @description 连接或创建SQLite数据库，执行必要的初始化、迁移和验证操作
 */
export const init = (lxDataPath: string): boolean | null => {
  // 构建数据库文件路径和native binding路径
  const databasePath = path.join(lxDataPath, 'lx.data.db')
  const nativeBinding = path.join(__dirname, '../node_modules/better-sqlite3/build/Release/better_sqlite3.node')
  let dbFileExists = true

  try {
    // 尝试连接已存在的数据库文件
    db = new Database(databasePath, {
      fileMustExist: true, // 要求数据库文件必须存在
      nativeBinding,      // 指定native binding路径
      // verbose: process.env.NODE_ENV !== 'production' ? console.log : undefined, // 开发环境下启用日志
    })
  } catch (error) {
    // 数据库文件不存在，创建新数据库
    console.log(error)
    db = new Database(databasePath, {
      nativeBinding,      // 指定native binding路径
      // verbose: process.env.NODE_ENV !== 'production' ? console.log : undefined, // 开发环境下启用日志
    })
    // 初始化表结构
    initTables(db)
    dbFileExists = false
  }

  // 如果数据库已存在，执行数据迁移操作
  if (dbFileExists) migrateData(db)

  // 优化数据库性能
  // https://www.sqlite.org/pragma.html#pragma_optimize
  if (dbFileExists) db.exec('PRAGMA optimize;')
  
  // 验证数据库结构是否正确
  if (!verifyDB(db)) {
    db.close() // 验证失败，关闭数据库连接
    return null
  }

  // 数据库压缩（当前已注释）
  // https://www.sqlite.org/lang_vacuum.html
  // db.exec('VACUUM "main"')

  // 确保程序退出时关闭数据库连接
  process.on('exit', () => db.close())
  console.log('db inited')
  // require('./test')
  return dbFileExists
}

/**
 * 获取数据库实例
 * @returns {Database.Database} - 返回全局数据库连接实例
 * @description 提供对已初始化数据库连接的访问
 */
export const getDB = (): Database.Database => db
