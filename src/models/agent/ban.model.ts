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
    tableName: 'bans',
    freezeTableName: true,
    timestamps: false
})
export class BanModel extends Model<
    InferAttributes<BanModel>,
    InferCreationAttributes<BanModel>
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
    declare bannedBy: string

    @Attribute(DataTypes.STRING)
    declare approvedBy: string | null

    @Attribute(DataTypes.TEXT)
    @NotNull
    declare reason: string

    @Attribute(DataTypes.STRING)
    declare banDate: Date | null

    @Attribute(DataTypes.BOOLEAN)
    @NotNull
    declare unbanDate: Date
}
