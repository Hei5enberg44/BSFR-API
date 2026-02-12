import {
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    NonAttribute,
    BelongsToGetAssociationMixin
} from '@sequelize/core'
import {
    Table,
    Attribute,
    PrimaryKey,
    AutoIncrement,
    NotNull,
    BelongsTo
} from '@sequelize/core/decorators-legacy'
import { RoleCategorieModel } from './roleCategorie.model.js'

@Table({
    tableName: 'roles',
    freezeTableName: true,
    timestamps: false
})
export class RoleModel extends Model<
    InferAttributes<RoleModel>,
    InferCreationAttributes<RoleModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.INTEGER)
    @NotNull
    declare categoryId: number

    @Attribute(DataTypes.STRING)
    @NotNull
    declare name: string

    @Attribute(DataTypes.JSON)
    @NotNull
    declare nameLocalizations: object

    @Attribute(DataTypes.BOOLEAN)
    @NotNull
    declare multiple: boolean

    @BelongsTo(() => RoleCategorieModel, 'categoryId')
    declare category: NonAttribute<RoleCategorieModel>

    declare getCategory: BelongsToGetAssociationMixin<RoleCategorieModel>
}
