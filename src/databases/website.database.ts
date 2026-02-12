import { Sequelize, importModels } from '@sequelize/core'
import { MariaDbDialect } from '@sequelize/mariadb'
import { Sequelize as SequelizeLegacy } from 'sequelize'
import * as path from 'node:path'
import config from '../../config.json' with { type: 'json' }

const dirname = import.meta.dirname
const models = path
    .resolve(dirname, '../models/website', '*.model.{ts,js}')
    .replace(/\\/g, '/')

export const websiteDB = new Sequelize({
    dialect: MariaDbDialect,
    database: config.databases.website.name,
    user: config.databases.website.username,
    password: config.databases.website.password,
    host: config.databases.website.host,
    port: config.databases.website.port,
    models: await importModels(models)
})

export const websiteDBLegacy = new SequelizeLegacy({
    dialect: 'mariadb',
    database: config.databases.website.name,
    username: config.databases.website.username,
    password: config.databases.website.password,
    host: config.databases.website.host,
    port: config.databases.website.port,
    logging: undefined
})
