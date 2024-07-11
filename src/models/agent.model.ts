import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize'
import { AgentSettingData } from '../controllers/settings.js'
import config from '../config.json' assert { type: 'json' }

const sequelizeAgent = new Sequelize(config.databases.agent.name, config.databases.agent.username, config.databases.agent.password, {
    host: config.databases.agent.host,
    port: config.databases.agent.port,
    dialect: 'mariadb',
    logging: false,
    define: {
        timestamps: false,
        freezeTableName: true
    },
    timezone: 'Europe/Paris'
})

interface A_BanModel extends Model<InferAttributes<A_BanModel>, InferCreationAttributes<A_BanModel>> {
    id: CreationOptional<number>,
    memberId: string,
    bannedBy: string,
    approvedBy: string | null,
    reason: string,
    banDate: Date | null,
    unbanDate: Date
}

const A_BanModel = sequelizeAgent.define<A_BanModel>('bans', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    memberId: DataTypes.STRING(255),
    bannedBy: DataTypes.STRING(255),
    approvedBy: DataTypes.STRING(255),
    reason: DataTypes.TEXT(),
    banDate: DataTypes.DATE(),
    unbanDate: DataTypes.DATE()
})

interface A_BirthdayModel extends Model<InferAttributes<A_BirthdayModel>, InferCreationAttributes<A_BirthdayModel>> {
    id: CreationOptional<number>,
    memberId: string,
    date: Date
}

const A_BirthdayModel = sequelizeAgent.define<A_BirthdayModel>('birthdays', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    memberId: DataTypes.STRING(255),
    date: DataTypes.DATEONLY()
})

interface A_BirthdayMessageModel extends Model<InferAttributes<A_BirthdayMessageModel>, InferCreationAttributes<A_BirthdayMessageModel>> {
    id: CreationOptional<number>,
    message: string,
    memberId: string,
    date: Date
}

const A_BirthdayMessageModel = sequelizeAgent.define<A_BirthdayMessageModel>('birthday_messages', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    message: DataTypes.TEXT(),
    memberId: DataTypes.STRING(255),
    date: DataTypes.DATE()
})

interface A_CitieModel extends Model<InferAttributes<A_CitieModel>, InferCreationAttributes<A_CitieModel>> {
    id: CreationOptional<number>,
    memberId: string,
    pays: string,
    commune: string,
    coordonnees_gps: string
}

const A_CitieModel = sequelizeAgent.define<A_CitieModel>('cities', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    memberId: DataTypes.STRING(255),
    pays: DataTypes.STRING(255),
    commune: DataTypes.STRING(255),
    coordonnees_gps: DataTypes.STRING(255)
})

interface A_MaliciousURLModel extends Model<InferAttributes<A_MaliciousURLModel>, InferCreationAttributes<A_MaliciousURLModel>> {
    id: CreationOptional<number>,
    url: string,
    memberId: string,
    date: Date
}

const A_MaliciousURLModel = sequelizeAgent.define<A_MaliciousURLModel>('malicious_url', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    url: DataTypes.TEXT(),
    memberId: DataTypes.STRING(255),
    date: DataTypes.DATE()
})

interface A_MuteModel extends Model<InferAttributes<A_MuteModel>, InferCreationAttributes<A_MuteModel>> {
    id: CreationOptional<number>,
    memberId: string,
    mutedBy: string,
    reason: string,
    muteDate: Date,
    unmuteDate: Date
}

const A_MuteModel = sequelizeAgent.define<A_MuteModel>('mutes', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    memberId: DataTypes.STRING(255),
    mutedBy: DataTypes.STRING(255),
    reason: DataTypes.TEXT(),
    muteDate: DataTypes.DATE(),
    unmuteDate: DataTypes.DATE()
})

interface A_RoleModel extends Model<InferAttributes<A_RoleModel>, InferCreationAttributes<A_RoleModel>> {
    id: CreationOptional<number>,
    categoryId: number,
    name: string,
    multiple: boolean
}

const A_RoleModel = sequelizeAgent.define<A_RoleModel>('roles', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    categoryId: DataTypes.INTEGER(),
    name: DataTypes.STRING(255),
    multiple: DataTypes.BOOLEAN()
})

interface A_RolesCategorieModel extends Model<InferAttributes<A_RolesCategorieModel>, InferCreationAttributes<A_RolesCategorieModel>> {
    id: CreationOptional<number>,
    name: string
}

const A_RolesCategorieModel = sequelizeAgent.define<A_RolesCategorieModel>('roles_categories', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    name: DataTypes.STRING(255)
})

A_RoleModel.hasOne(A_RolesCategorieModel, {
    sourceKey: 'categoryId',
    foreignKey: 'id'
})

interface A_SettingModel extends Model<InferAttributes<A_SettingModel>, InferCreationAttributes<A_SettingModel>> {
    id: CreationOptional<number>,
    name: string,
    data: AgentSettingData
}

const A_SettingModel = sequelizeAgent.define<A_SettingModel>('settings', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    name: DataTypes.STRING(255),
    data: DataTypes.JSON()
})

interface A_TwitchModel extends Model<InferAttributes<A_TwitchModel>, InferCreationAttributes<A_TwitchModel>> {
    id: CreationOptional<number>,
    memberId: string,
    channelName: string,
    live: boolean,
    messageId: string
}

const A_TwitchModel = sequelizeAgent.define<A_TwitchModel>('twitch', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    memberId: DataTypes.STRING(255),
    channelName: DataTypes.STRING(255),
    live: DataTypes.BOOLEAN(),
    messageId: DataTypes.STRING(255)
})

interface A_YoutubeVideoModel extends Model<InferAttributes<A_YoutubeVideoModel>, InferCreationAttributes<A_YoutubeVideoModel>> {
    id: CreationOptional<number>,
    videoId: string,
    publishedAt: Date,
    title: string
}

const A_YoutubeVideoModel = sequelizeAgent.define<A_YoutubeVideoModel>('youtube_videos', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    videoId: DataTypes.STRING(255),
    publishedAt: DataTypes.DATE(),
    title: DataTypes.STRING(255)
})

export {
    A_BanModel, A_BirthdayModel, A_BirthdayMessageModel, A_CitieModel, A_MaliciousURLModel, A_MuteModel, A_RoleModel, A_RolesCategorieModel, A_SettingModel, A_TwitchModel, A_YoutubeVideoModel
}