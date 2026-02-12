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
    NotNull,
    Default
} from '@sequelize/core/decorators-legacy'

@Table({
    tableName: 'cooldowns',
    freezeTableName: true,
    timestamps: false
})
export class CooldownModel extends Model<
    InferAttributes<CooldownModel>,
    InferCreationAttributes<CooldownModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.STRING)
    @NotNull
    declare memberId: string

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare timeThreshold: number

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare countThreshold: number

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare muteDuration: number

    @Attribute(DataTypes.DATE)
    declare messageDate: Date | null

    @Attribute(DataTypes.INTEGER)
    @Default(0)
    declare count: CreationOptional<number>
}
