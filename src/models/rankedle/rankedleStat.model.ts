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

@Table({
    tableName: 'rankedle_stats',
    freezeTableName: true,
    timestamps: false
})
export class RankedleStatModel extends Model<
    InferAttributes<RankedleStatModel>,
    InferCreationAttributes<RankedleStatModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare seasonId: number

    @Attribute(DataTypes.STRING)
    @NotNull
    declare memberId: string

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare try1: number

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare try2: number

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare try3: number

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare try4: number

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare try5: number

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare try6: number

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare played: number

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare won: number

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare currentStreak: number

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare maxStreak: number

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare points: number
}
