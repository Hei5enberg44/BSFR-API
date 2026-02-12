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

export enum RankedleMessageType {
    FIRST_TRY = 'first_try',
    WON = 'won',
    LOSE = 'lose'
}

@Table({
    tableName: 'rankedle_messages',
    freezeTableName: true,
    timestamps: false
})
export class RankedleMessageModel extends Model<
    InferAttributes<RankedleMessageModel>,
    InferCreationAttributes<RankedleMessageModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.STRING)
    @NotNull
    declare type: RankedleMessageType

    @Attribute(DataTypes.TEXT)
    declare content: string | null

    @Attribute(DataTypes.BLOB('medium'))
    declare image: Buffer | null
}
