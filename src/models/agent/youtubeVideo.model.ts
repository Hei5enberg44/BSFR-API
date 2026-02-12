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
    tableName: 'youtube_videos',
    freezeTableName: true,
    timestamps: false
})
export class YoutubeVideoModel extends Model<
    InferAttributes<YoutubeVideoModel>,
    InferCreationAttributes<YoutubeVideoModel>
> {
    @Attribute(DataTypes.INTEGER)
    @PrimaryKey
    @AutoIncrement
    declare id: CreationOptional<number>

    @Attribute(DataTypes.STRING)
    @NotNull
    declare videoId: string

    @Attribute(DataTypes.DATE)
    @NotNull
    declare publishedAt: Date

    @Attribute(DataTypes.STRING)
    @NotNull
    declare title: string
}
