import { Sequelize, importModels } from '@sequelize/core'
import { MariaDbDialect } from '@sequelize/mariadb'
import * as path from 'node:path'
import config from '../../config.json' with { type: 'json' }

const dirname = import.meta.dirname
const models = path
    .resolve(dirname, '../models/cubestalker', '*.model.{ts,js}')
    .replace(/\\/g, '/')

export const cubestalkerDB = new Sequelize({
    dialect: MariaDbDialect,
    database: config.databases.cubestalker.name,
    user: config.databases.cubestalker.username,
    password: config.databases.cubestalker.password,
    host: config.databases.cubestalker.host,
    port: config.databases.cubestalker.port,
    models: await importModels(models)
})
