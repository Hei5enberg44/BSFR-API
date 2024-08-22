import {
    Sequelize,
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional
} from 'sequelize'
import { components as ScoreSaberAPI } from '../api/scoresaber.js'
import { components as BeatLeaderAPI } from '../api/beatleader.js'
import config from '../config.json' assert { type: 'json' }

const sequelizeCubeStalker = new Sequelize(
    config.databases.cubestalker.name,
    config.databases.cubestalker.username,
    config.databases.cubestalker.password,
    {
        host: config.databases.agent.host,
        port: config.databases.agent.port,
        dialect: 'mariadb',
        logging: false,
        define: {
            timestamps: false,
            freezeTableName: true
        },
        timezone: 'Europe/Paris'
    }
)

interface CS_CardModel
    extends Model<
        InferAttributes<CS_CardModel>,
        InferCreationAttributes<CS_CardModel>
    > {
    id: CreationOptional<number>
    memberId: string
    image: Buffer
    status: number
}

const CS_CardModel = sequelizeCubeStalker.define<CS_CardModel>('cards', {
    id: {
        type: DataTypes.INTEGER(),
        autoIncrement: true,
        primaryKey: true
    },
    memberId: DataTypes.STRING(255),
    image: DataTypes.BLOB(),
    status: DataTypes.INTEGER()
})

interface CS_PlayerModel
    extends Model<
        InferAttributes<CS_PlayerModel>,
        InferCreationAttributes<CS_PlayerModel>
    > {
    id: CreationOptional<number>
    leaderboard: string
    memberId: string
    playerId: string
    playerName: string | null
    playerCountry: string | null
    pp: number | null
    rank: number | null
    countryRank: number | null
    averageRankedAccuracy: number | null
    serverRankAcc: number | null
    serverRankPP: number | null
    top1: boolean
}

const CS_PlayerModel = sequelizeCubeStalker.define<CS_PlayerModel>('players', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    leaderboard: DataTypes.STRING(255),
    memberId: DataTypes.STRING(255),
    playerId: DataTypes.STRING(255),
    playerName: DataTypes.STRING(255),
    playerCountry: DataTypes.STRING(5),
    pp: DataTypes.DOUBLE(),
    rank: DataTypes.INTEGER(),
    countryRank: DataTypes.INTEGER(),
    averageRankedAccuracy: DataTypes.DOUBLE(),
    serverRankAcc: DataTypes.INTEGER(),
    serverRankPP: DataTypes.INTEGER(),
    top1: DataTypes.BOOLEAN()
})

type ScoreSaberPlayerScore = ScoreSaberAPI['schemas']['PlayerScore']

interface CS_ScoreSaberPlayerScoreModel
    extends Model<
        InferAttributes<CS_ScoreSaberPlayerScoreModel>,
        InferCreationAttributes<CS_ScoreSaberPlayerScoreModel>
    > {
    id: CreationOptional<number>
    leaderboard: string
    playerId: string
    playerScore: ScoreSaberPlayerScore
}

const CS_ScoreSaberPlayerScoreModel =
    sequelizeCubeStalker.define<CS_ScoreSaberPlayerScoreModel>(
        'player_scores',
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            leaderboard: DataTypes.STRING(255),
            playerId: DataTypes.STRING(255),
            playerScore: DataTypes.JSON()
        }
    )

type BeatLeaderPlayerScore =
    BeatLeaderAPI['schemas']['ScoreResponseWithMyScore']

interface CS_BeatLeaderPlayerScoreModel
    extends Model<
        InferAttributes<CS_BeatLeaderPlayerScoreModel>,
        InferCreationAttributes<CS_BeatLeaderPlayerScoreModel>
    > {
    id: CreationOptional<number>
    leaderboard: string
    playerId: string
    playerScore: BeatLeaderPlayerScore
}

const CS_BeatLeaderPlayerScoreModel =
    sequelizeCubeStalker.define<CS_BeatLeaderPlayerScoreModel>(
        'player_scores',
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            leaderboard: DataTypes.STRING(255),
            playerId: DataTypes.STRING(255),
            playerScore: DataTypes.JSON()
        }
    )

interface CS_LeaderboardModel
    extends Model<
        InferAttributes<CS_LeaderboardModel>,
        InferCreationAttributes<CS_LeaderboardModel>
    > {
    id: CreationOptional<number>
    leaderboard: string
    memberId: string
    playerId: string
    playerName: string
    playerCountry: string
    pp: number
    rank: number
    countryRank: number
    averageRankedAccuracy: number
    serverRankAcc: number
    serverRankPP: number
}

const CS_LeaderboardModel = sequelizeCubeStalker.define<CS_LeaderboardModel>(
    'leaderboard',
    {
        id: {
            type: DataTypes.INTEGER(),
            autoIncrement: true,
            primaryKey: true
        },
        leaderboard: DataTypes.STRING(255),
        memberId: DataTypes.STRING(255),
        playerId: DataTypes.STRING(255),
        playerName: DataTypes.STRING(255),
        playerCountry: DataTypes.STRING(5),
        pp: DataTypes.DOUBLE(),
        rank: DataTypes.INTEGER(),
        countryRank: DataTypes.INTEGER(),
        averageRankedAccuracy: DataTypes.DOUBLE(),
        serverRankAcc: DataTypes.INTEGER(),
        serverRankPP: DataTypes.INTEGER()
    }
)

export {
    CS_CardModel,
    CS_LeaderboardModel,
    CS_PlayerModel,
    CS_BeatLeaderPlayerScoreModel,
    CS_ScoreSaberPlayerScoreModel
}
