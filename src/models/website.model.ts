import {
    Sequelize,
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional
} from 'sequelize'
import config from '../config.json' assert { type: 'json' }

const sequelizeWebsite = new Sequelize(
    config.databases.website.name,
    config.databases.website.username,
    config.databases.website.password,
    {
        host: config.databases.website.host,
        port: config.databases.website.port,
        dialect: 'mariadb',
        logging: false,
        define: {
            timestamps: false,
            freezeTableName: true
        },
        timezone: 'Europe/Paris'
    }
)

interface WS_RunModel
    extends Model<
        InferAttributes<WS_RunModel>,
        InferCreationAttributes<WS_RunModel>
    > {
    id: CreationOptional<number>
    memberId: string
    url: string
    description: string
    map: string
    headset: number
    grip: string
    comment: string | null
    date: Date | null
    status: number
}

const WS_RunModel = sequelizeWebsite.define<WS_RunModel>('runs', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    memberId: DataTypes.STRING(255),
    url: DataTypes.TEXT(),
    description: DataTypes.TEXT(),
    map: DataTypes.STRING(255),
    headset: DataTypes.INTEGER(),
    grip: DataTypes.STRING(255),
    comment: DataTypes.TEXT(),
    date: DataTypes.DATE(),
    status: DataTypes.INTEGER()
})

interface WS_SessionModel
    extends Model<
        InferAttributes<WS_SessionModel>,
        InferCreationAttributes<WS_SessionModel>
    > {
    id: CreationOptional<number>
    sessionId: string
    token: string
    expire: Date
}

const WS_SessionModel = sequelizeWebsite.define<WS_SessionModel>('sessions', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    sessionId: {
        type: DataTypes.STRING(255),
        unique: true
    },
    token: DataTypes.TEXT(),
    expire: DataTypes.DATE()
})

export { WS_RunModel, WS_SessionModel }
