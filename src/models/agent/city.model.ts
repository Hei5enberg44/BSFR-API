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
    tableName: 'cities',
    freezeTableName: true,
    timestamps: false
})
export class CityModel extends Model<
    InferAttributes<CityModel>,
    InferCreationAttributes<CityModel>
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
    declare country: string

    @Attribute(DataTypes.STRING)
    @NotNull
    declare city: string

    @Attribute(DataTypes.STRING)
    @NotNull
    declare coordinates: string
}
