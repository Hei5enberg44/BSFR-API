import { BirthdayModel } from '../models/agent/birthday.model.js'
import { RoleModel } from '../models/agent/role.model.js'
import { RoleCategorieModel } from '../models/agent/roleCategorie.model.js'
import { CityModel } from '../models/agent/city.model.js'
import { TwitchModel } from '../models/agent/twitch.model.js'
import { CardModel } from '../models/cubestalker/card.model.js'
import { PlayerModel } from '../models/cubestalker/player.model.js'
import {
    EmbedBuilder,
    userMention,
    hyperlink,
    Guild,
    TextChannel,
    GuildMember
} from 'discord.js'
import { City } from './city.js'
import { GameLeaderboard, Leaderboards } from './gameLeaderboard.js'
import { PlayerData } from '../interfaces/player.interface.js'
import { CubeStalker } from './cubestalker.js'
import { CardStatus } from '../models/cubestalker/card.model.js'

import { AppError } from '../utils/error.js'
import config from '../../config.json' with { type: 'json' }
import Logger from '../utils/logger.js'

interface UserRole {
    categoryName: string
    roles: {
        id: number
        name: string
        multiple: boolean
        checked: boolean
    }[]
}

interface UserCity {
    id: string
    name: string
}

export class SettingsError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'SettingsError'
        Error.captureStackTrace(this, this.constructor)
    }
}

export class Settings {
    public static async getBirthday(memberId: string) {
        const userBirthday = await BirthdayModel.findOne({
            where: { memberId },
            raw: true
        })
        return userBirthday
            ? new Date(userBirthday.date).toLocaleDateString()
            : null
    }

    public static async setBirthday(memberId: string, date: string | null) {
        if (date !== null) {
            const userBirthday = await BirthdayModel.findOne({
                where: { memberId }
            })

            if (userBirthday) {
                userBirthday.date = date
                await userBirthday.save()
            } else {
                await BirthdayModel.create({
                    memberId,
                    date
                })
            }
        } else {
            await BirthdayModel.destroy({
                where: { memberId }
            })
        }
    }

    public static async getRoles(member: GuildMember) {
        const memberRoles = member.roles.cache

        const roleCategoryList = await RoleCategorieModel.findAll()

        const userRoleList: UserRole[] = []
        for (const roleCategory of roleCategoryList) {
            const categoryRoles = await roleCategory.getRoles()
            userRoleList.push({
                categoryName: roleCategory.name,
                roles: categoryRoles.map((cr) => {
                    const checked = memberRoles.find(
                        (mr) => mr.name === cr.name
                    )
                        ? true
                        : false
                    return {
                        id: cr.id,
                        name: cr.name,
                        multiple: cr.multiple,
                        checked
                    }
                })
            })
        }

        return userRoleList
    }

    public static async setRoles(member: GuildMember, roles: string[]) {
        const guildRoles = member.guild.roles.cache
        const roleList = await RoleModel.findAll({
            include: [
                {
                    association: 'category',
                    required: true
                }
            ]
        })
        const assignableRoles = guildRoles.filter((gr) =>
            roleList.find((rl) => rl.name === gr.name)
        )
        const currentMemberRoles = member.roles.cache.filter(
            (mr) => !assignableRoles.find((ar) => ar.id === mr.id)
        )
        const newUserRoles = assignableRoles.filter((ar) => {
            return roles.find((r) => r === ar.name)
        })

        const check: RoleModel[] = []
        for (const [, role] of newUserRoles) {
            const _role = roleList.find((r) => r.name === role.name)
            if (typeof _role !== 'undefined') {
                if (
                    !_role.multiple &&
                    check.find(
                        (c) =>
                            c.multiple === _role.multiple &&
                            c.categoryId === _role.categoryId
                    )
                ) {
                    throw new AppError(
                        400,
                        'ERR_VALIDATION',
                        'Bad Request',
                        `Vous pouvez vous assigner qu'un seul rôle pour la catégorie « ${_role.category.name} »`
                    )
                } else {
                    check.push(_role)
                }
            } else {
                throw new AppError(
                    400,
                    'ERR_VALIDATION',
                    'Bad Request',
                    'Impossible de mettre à jour les rôles'
                )
            }
        }

        const updatedRoles = currentMemberRoles.concat(newUserRoles)
        await member.roles.set(updatedRoles)
    }

    public static async getCity(memberId: string) {
        const city = await CityModel.findOne({
            where: { memberId },
            raw: true
        })
        return city
    }

    public static async setCity(memberId: string, city: UserCity | null) {
        if (city !== null) {
            const cityData = await City.getCityById(city.id)
            if (cityData.length === 0)
                throw new AppError(
                    400,
                    'ERR_VALIDATION',
                    'Bad Request',
                    'Ville introuvable'
                )

            const userCity = await CityModel.findOne({
                where: { memberId }
            })

            if (!userCity) {
                await CityModel.create({
                    memberId,
                    country: cityData[0].country,
                    city: cityData[0].name,
                    coordinates: `${cityData[0].coordinates.lat},${cityData[0].coordinates.lon}`
                })
            } else {
                userCity.country = cityData[0].country
                userCity.city = cityData[0].name
                userCity.coordinates = `${cityData[0].coordinates.lat},${cityData[0].coordinates.lon}`
                await userCity.save()
            }
        } else {
            await CityModel.destroy({
                where: { memberId }
            })
        }
    }

    public static async searchCity(name: string) {
        const results = name.length >= 3 ? await City.getCityList(name) : []
        return results
    }

    public static async getTwitchChannel(memberId: string) {
        const twitch = await TwitchModel.findOne({
            where: { memberId },
            raw: true
        })
        return twitch
            ? {
                  name: twitch.channelName
              }
            : null
    }

    public static async setTwitchChannel(
        memberId: string,
        channelName: string | null
    ) {
        if (channelName !== null) {
            const userTwitch = await TwitchModel.findOne({
                where: { memberId }
            })

            if (!userTwitch) {
                await TwitchModel.create({
                    memberId,
                    channelName,
                    live: false,
                    messageId: ''
                })
            } else {
                userTwitch.channelName = channelName
                userTwitch.live = false
                userTwitch.messageId = ''
                await userTwitch.save()
            }
        } else {
            await TwitchModel.destroy({
                where: { memberId }
            })
        }
    }

    public static async getCubeStalkerCard(
        member: GuildMember,
        memberCardImage: Buffer | null = null
    ) {
        if (memberCardImage)
            await CubeStalker.setMemberCard(
                member.id,
                memberCardImage,
                CardStatus.Preview
            )

        const playerProfiles = await PlayerModel.findAll({
            where: { memberId: member.id },
            raw: true
        })

        const currentPlayerData =
            playerProfiles.length > 0 ? playerProfiles[0] : null
        if (currentPlayerData) {
            const leaderboard = currentPlayerData.leaderboard as Leaderboards
            const ld = new GameLeaderboard(leaderboard)

            const playerData = await ld.requests.getPlayerData(
                currentPlayerData.playerId
            )

            const card = await CubeStalker.getCard(
                leaderboard,
                member,
                playerData,
                null,
                memberCardImage
            )

            return card
        } else {
            const leaderboard = Leaderboards.ScoreSaber
            const playerData: PlayerData = {
                id: '',
                name: 'Beat Saber FR',
                avatar: '',
                profileCover: null,
                url: '',
                rank: 1,
                countryRank: 1,
                points: 727,
                country: 'FR',
                history: '',
                inactive: false,
                banned: false,
                averageRankedAccuracy: 69,
                topScore: null
            }

            const card = await CubeStalker.getCard(
                leaderboard,
                member,
                playerData,
                null,
                memberCardImage
            )

            return card
        }
    }

    public static async getCardStatus(memberId: string) {
        const card = await CardModel.findOne({
            where: { memberId }
        })
        return card ? card.status : null
    }

    public static async updateCardStatus(memberId: string, status: CardStatus) {
        const card = await CardModel.findOne({
            where: { memberId }
        })
        if (card) {
            card.status = status
            await card.save()
            return card.id
        }
        return null
    }

    public static async sendCardRequest(
        guild: Guild,
        memberId: string,
        cardId: number
    ) {
        const url = `https://bsaber.fr/admin/cube-stalker/${cardId}`

        const embed = new EmbedBuilder()
            .setTitle('🖼️ Image de carte Cube-Stalker')
            .setColor(3447003)
            .setDescription(
                "Nouvelle demande d'approbation reçue pour une image de carte Cube-Stalker"
            )
            .setFields([
                {
                    name: 'Auteur·ice de la demande',
                    value: userMention(memberId),
                    inline: true
                },
                {
                    name: 'Lien de la demande',
                    value: hyperlink('Ouvrir', url),
                    inline: true
                }
            ])

        await (
            guild.channels.cache.get(
                config.discord.guild.channels.logs
            ) as TextChannel
        ).send({
            embeds: [embed]
        })
        return url
    }

    public static async sendCardApprovalNotification(
        member: GuildMember,
        authorId: string,
        approved: boolean
    ) {
        const embed = new EmbedBuilder()
            .setTitle('🖼️ Image de carte Cube-Stalker')
            .setColor(3447003)
            .setDescription(
                `Demande d'approbation pour une image de carte Cube-Stalker ${approved ? 'acceptée' : 'refusée'}`
            )
            .setFields(
                {
                    name: 'Auteur·ice de la demande',
                    value: userMention(member.id),
                    inline: true
                },
                {
                    name: `Demande ${approved ? 'acceptée' : 'refusée'} par`,
                    value: userMention(authorId),
                    inline: true
                }
            )

        const guild = member.guild
        const logsChannel = guild.channels.cache.get(
            config.discord.guild.channels.logs
        ) as TextChannel
        try {
            await logsChannel.send({ embeds: [embed] })
        } catch (error) {
            Logger.log(
                'Settings',
                'ERROR',
                "Échec de l'envoi du message d'approbation de carte Cube-Stalker dans le channel #logs"
            )
        }
        try {
            await member.send({ embeds: [embed] })
        } catch (error) {
            Logger.log(
                'Settings',
                'ERROR',
                `Échec de l\'envoi du message d\'approbation de carte Cube-Stalker à ${member.user.username}`
            )
        }
    }
}
