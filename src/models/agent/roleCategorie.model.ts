import {
    DataTypes,
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    NonAttribute,
    HasManyGetAssociationsMixin
} from '@sequelize/core'
import {
    Table,
    Attribute,
    PrimaryKey,
    AutoIncrement,
    NotNull,
    HasMany
} from '@sequelize/core/decorators-legacy'
import { RoleModel } from './role.model.js'

@Table({
    tableName: 'roles_categories',
    freezeTableName: true,
    timestamps: false
})
export class RoleCategorieModel extends Model<
    InferAttributes<RoleCategorieModel>,
    InferCreationAttributes<RoleCategorieModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.STRING)
    @NotNull
    declare name: string

    @Attribute(DataTypes.JSON)
    @NotNull
    declare nameLocalizations: object

    @HasMany(() => RoleModel, 'categoryId')
    declare roles?: NonAttribute<RoleModel[]>

    declare getRoles: HasManyGetAssociationsMixin<RoleModel>
}
