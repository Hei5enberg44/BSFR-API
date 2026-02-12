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

export enum RankedleScoreDetailStatus {
    SKIP = 'skip',
    FAIL = 'fail'
}

export interface RankedleScoreDetail {
    status: RankedleScoreDetailStatus
    text: string
    mapId?: number
    date: number
}

@Table({
    tableName: 'rankedle_scores',
    freezeTableName: true,
    timestamps: false
})
export class RankedleScoreModel extends Model<
    InferAttributes<RankedleScoreModel>,
    InferCreationAttributes<RankedleScoreModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare rankedleId: number

    @Attribute(DataTypes.STRING)
    @NotNull
    declare memberId: string

    @Attribute(DataTypes.DATE)
    declare dateStart: Date | null

    @Attribute(DataTypes.DATE)
    declare dateEnd: Date | null

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare skips: number

    @Attribute(DataTypes.JSON)
    declare details: RankedleScoreDetail[] | null

    @Attribute(DataTypes.BOOLEAN)
    @NotNull
    declare hint: boolean

    @Attribute(DataTypes.BOOLEAN)
    declare success: boolean | null

    @Attribute(DataTypes.INTEGER)
    declare messageId: number | null
}
