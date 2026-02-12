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
    tableName: 'mutes',
    freezeTableName: true,
    timestamps: false
})
export class MuteModel extends Model<
    InferAttributes<MuteModel>,
    InferCreationAttributes<MuteModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.STRING)
    @NotNull
    declare memberId: string

    @Attribute(DataTypes.STRING)
    @NotNull
    declare mutedBy: string

    @Attribute(DataTypes.TEXT)
    @NotNull
    declare reason: string

    @Attribute(DataTypes.DATE)
    @NotNull
    declare muteDate: Date

    @Attribute(DataTypes.DATE)
    @NotNull
    declare unmuteDate: Date
}
