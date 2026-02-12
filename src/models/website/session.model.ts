import {
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes
} from '@sequelize/core'
import {
    Table,
    Attribute,
    PrimaryKey,
    NotNull
} from '@sequelize/core/decorators-legacy'

@Table({
    tableName: 'sessions',
    freezeTableName: true,
    timestamps: false
})
export class SessionModel extends Model<
    InferAttributes<SessionModel>,
    InferCreationAttributes<SessionModel>
> {
    @Attribute(DataTypes.STRING)
    @NotNull
    @PrimaryKey
    declare sid: string

    @Attribute(DataTypes.DATE)
    @NotNull
    declare expires: Date

    @Attribute(DataTypes.TEXT)
    @NotNull
    declare data: string
}
