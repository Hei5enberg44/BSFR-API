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
    HasOne
} from '@sequelize/core/decorators-legacy'
import { RankedleModel } from './rankedle.model.js'

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

@Table({
    tableName: 'rankedle_maps',
    freezeTableName: true,
    timestamps: false
})
export class RankedleMapModel extends Model<
    InferAttributes<RankedleMapModel>,
    InferCreationAttributes<RankedleMapModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.JSON)
    @NotNull
    declare map: MapData

    @HasOne(() => RankedleModel, {
        sourceKey: 'id',
        foreignKey: 'mapId'
    })
    declare rankedle?: NonAttribute<RankedleModel>

    declare getRankedle: HasOneGetAssociationMixin<RankedleModel>
}
