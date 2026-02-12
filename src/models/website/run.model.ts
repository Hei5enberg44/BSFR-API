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
    tableName: 'runs',
    freezeTableName: true,
    timestamps: false
})
export class RunModel extends Model<
    InferAttributes<RunModel>,
    InferCreationAttributes<RunModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.STRING)
    @NotNull
    declare memberId: string

    @Attribute(DataTypes.TEXT)
    @NotNull
    declare url: string

    @Attribute(DataTypes.TEXT)
    @NotNull
    declare description: string

    @Attribute(DataTypes.STRING)
    @NotNull
    declare map: string

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare headset: number

    @Attribute(DataTypes.STRING)
    @NotNull
    declare grip: string

    @Attribute(DataTypes.TEXT)
    @NotNull
    declare comment: string

    @Attribute(DataTypes.DATE)
    @NotNull
    declare date: Date

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare status: number
}
