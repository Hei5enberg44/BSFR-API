import {
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional
} from '@sequelize/core'
import {
    Table,
    Attribute,
    PrimaryKey,
    AutoIncrement,
    NotNull
} from '@sequelize/core/decorators-legacy'
import { AgentSettingData } from '../../controllers/agent.js'

@Table({
    tableName: 'settings',
    freezeTableName: true,
    timestamps: false
})
export class SettingModel extends Model<
    InferAttributes<SettingModel>,
    InferCreationAttributes<SettingModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.STRING)
    @NotNull
    declare name: string

    @Attribute(DataTypes.JSON)
    @NotNull
    declare data: AgentSettingData
}
