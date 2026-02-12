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
    tableName: 'rankedle_seasons',
    freezeTableName: true,
    timestamps: false
})
export class RankedleSeasonModel extends Model<
    InferAttributes<RankedleSeasonModel>,
    InferCreationAttributes<RankedleSeasonModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.DATE)
    @NotNull
    declare dateStart: Date

    @Attribute(DataTypes.DATE)
    @NotNull
    declare dateEnd: Date
}
