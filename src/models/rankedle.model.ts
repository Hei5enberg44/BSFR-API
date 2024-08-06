import {
    Sequelize,
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional
} from 'sequelize'
import config from '../config.json' assert { type: 'json' }

interface MapData {
    id: string
    name: string
    qualified: boolean
    ranked: boolean
    versions: {
        coverURL: string
        downloadURL: string
    }[]
    metadata: {
        duration: number
        levelAuthorName: string
        songAuthorName: string
        songName: string
        songSubName: string
    }
}

interface RankedleScoreDetail {
    status: 'skip' | 'fail'
    text: string
    mapId?: number
}

const sequelizeRankedle = new Sequelize(
    config.databases.rankedle.name,
    config.databases.rankedle.username,
    config.databases.rankedle.password,
    {
        host: config.databases.rankedle.host,
        port: config.databases.rankedle.port,
        dialect: 'mariadb',
        logging: false,
        define: {
            timestamps: false,
            freezeTableName: true
        },
        timezone: 'Europe/Paris'
    }
)

interface R_RankedleModel
    extends Model<
        InferAttributes<R_RankedleModel>,
        InferCreationAttributes<R_RankedleModel>
    > {
    id: CreationOptional<number>
    seasonId: number
    mapId: number
    date?: Date
}

const R_RankedleModel = sequelizeRankedle.define<R_RankedleModel>('rankedles', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    seasonId: DataTypes.INTEGER(),
    mapId: DataTypes.INTEGER(),
    date: DataTypes.DATEONLY()
})

interface R_RankedleMapModel
    extends Model<
        InferAttributes<R_RankedleMapModel>,
        InferCreationAttributes<R_RankedleMapModel>
    > {
    id: CreationOptional<number>
    map: MapData
}

const R_RankedleMapModel = sequelizeRankedle.define<R_RankedleMapModel>(
    'rankedle_maps',
    {
        id: {
            type: DataTypes.INTEGER(),
            autoIncrement: true,
            primaryKey: true
        },
        map: DataTypes.JSON()
    }
)

interface R_RankedleMapExcludedModel
    extends Model<
        InferAttributes<R_RankedleMapExcludedModel>,
        InferCreationAttributes<R_RankedleMapExcludedModel>
    > {
    id: CreationOptional<number>
    mapId: string
}

const R_RankedleMapExcludedModel =
    sequelizeRankedle.define<R_RankedleMapExcludedModel>(
        'rankedle_maps_excluded',
        {
            id: {
                type: DataTypes.INTEGER(),
                autoIncrement: true,
                primaryKey: true
            },
            mapId: DataTypes.STRING(255)
        }
    )

interface R_RankedleMessageModel
    extends Model<
        InferAttributes<R_RankedleMessageModel>,
        InferCreationAttributes<R_RankedleMessageModel>
    > {
    id: CreationOptional<number>
    type: string
    content?: string
    image?: Buffer
}

const R_RankedleMessageModel = sequelizeRankedle.define<R_RankedleMessageModel>(
    'rankedle_messages',
    {
        id: {
            type: DataTypes.INTEGER(),
            autoIncrement: true,
            primaryKey: true
        },
        type: DataTypes.STRING(255),
        content: DataTypes.TEXT(),
        image: DataTypes.BLOB()
    }
)

interface R_RankedleScoreModel
    extends Model<
        InferAttributes<R_RankedleScoreModel>,
        InferCreationAttributes<R_RankedleScoreModel>
    > {
    id: CreationOptional<number>
    rankedleId: number
    memberId: string
    dateStart?: Date
    dateEnd?: Date
    skips: number
    details?: RankedleScoreDetail[]
    hint: boolean
    success?: boolean
    messageId?: number
}

const R_RankedleScoreModel = sequelizeRankedle.define<R_RankedleScoreModel>(
    'rankedle_scores',
    {
        id: {
            type: DataTypes.INTEGER(),
            autoIncrement: true,
            primaryKey: true
        },
        rankedleId: DataTypes.INTEGER(),
        memberId: DataTypes.STRING(255),
        dateStart: DataTypes.DATE(),
        dateEnd: DataTypes.DATE(),
        skips: DataTypes.INTEGER(),
        details: DataTypes.JSON(),
        hint: DataTypes.BOOLEAN(),
        success: DataTypes.BOOLEAN(),
        messageId: DataTypes.INTEGER()
    }
)

interface R_RankedleSeasonModel
    extends Model<
        InferAttributes<R_RankedleSeasonModel>,
        InferCreationAttributes<R_RankedleSeasonModel>
    > {
    id: CreationOptional<number>
    dateStart: Date
    dateEnd: Date
}

const R_RankedleSeasonModel = sequelizeRankedle.define<R_RankedleSeasonModel>(
    'rankedle_seasons',
    {
        id: {
            type: DataTypes.INTEGER(),
            autoIncrement: true,
            primaryKey: true
        },
        dateStart: DataTypes.DATE(),
        dateEnd: DataTypes.DATE()
    }
)

interface R_RankedleStatModel
    extends Model<
        InferAttributes<R_RankedleStatModel>,
        InferCreationAttributes<R_RankedleStatModel>
    > {
    id: CreationOptional<number>
    seasonId: number
    memberId: string
    try1: number
    try2: number
    try3: number
    try4: number
    try5: number
    try6: number
    [key: string]: any
    played: number
    won: number
    currentStreak: number
    maxStreak: number
    points: number
}

const R_RankedleStatModel = sequelizeRankedle.define<R_RankedleStatModel>(
    'rankedle_stats',
    {
        id: {
            type: DataTypes.INTEGER(),
            autoIncrement: true,
            primaryKey: true
        },
        seasonId: DataTypes.INTEGER(),
        memberId: DataTypes.STRING(255),
        try1: DataTypes.INTEGER(),
        try2: DataTypes.INTEGER(),
        try3: DataTypes.INTEGER(),
        try4: DataTypes.INTEGER(),
        try5: DataTypes.INTEGER(),
        try6: DataTypes.INTEGER(),
        played: DataTypes.INTEGER(),
        won: DataTypes.INTEGER(),
        currentStreak: DataTypes.INTEGER(),
        maxStreak: DataTypes.INTEGER(),
        points: DataTypes.FLOAT()
    }
)

R_RankedleMapModel.hasOne(R_RankedleModel, {
    sourceKey: 'id',
    foreignKey: 'mapId'
})

R_RankedleScoreModel.hasOne(R_RankedleModel, {
    sourceKey: 'rankedleId',
    foreignKey: 'id'
})

export {
    R_RankedleModel,
    R_RankedleMapModel,
    R_RankedleMapExcludedModel,
    R_RankedleMessageModel,
    R_RankedleScoreModel,
    R_RankedleSeasonModel,
    R_RankedleStatModel
}
