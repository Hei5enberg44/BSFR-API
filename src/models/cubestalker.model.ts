import {
    Sequelize,
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional
} from 'sequelize'
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

export { CS_CardModel }
