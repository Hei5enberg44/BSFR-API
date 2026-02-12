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
    tableName: 'rankedle_maps_excluded',
    freezeTableName: true,
    timestamps: false
})
export class RankedleMapExcludedModel extends Model<
    InferAttributes<RankedleMapExcludedModel>,
    InferCreationAttributes<RankedleMapExcludedModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare mapId: number
}
