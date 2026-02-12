import {
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    NonAttribute,
    HasOneGetAssociationMixin
} from '@sequelize/core'
import {
    Table,
    Attribute,
    PrimaryKey,
    AutoIncrement,
    NotNull,
    Default,
    HasOne
} from '@sequelize/core/decorators-legacy'
import { RankedleMapModel } from './rankedleMap.model.js'

@Table({
    tableName: 'rankedles',
    freezeTableName: true,
    timestamps: false
})
export class RankedleModel extends Model<
    InferAttributes<RankedleModel>,
    InferCreationAttributes<RankedleModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare seasonId: number

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare mapId: number

    @HasOne(() => RankedleMapModel, {
        sourceKey: 'mapId',
        foreignKey: 'id'
    })
    declare map?: NonAttribute<RankedleMapModel>

    declare getMap: HasOneGetAssociationMixin<RankedleMapModel>

    @Attribute(DataTypes.DATEONLY)
    @Default(DataTypes.NOW)
    declare date: CreationOptional<Date>
}
