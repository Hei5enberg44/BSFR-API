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
    tableName: 'birthdays',
    freezeTableName: true,
    timestamps: false
})
export class BirthdayModel extends Model<
    InferAttributes<BirthdayModel>,
    InferCreationAttributes<BirthdayModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.STRING)
    @NotNull
    declare memberId: string

    @Attribute(DataTypes.DATEONLY)
    @NotNull
    declare date: string
}
