import { Sequelize } from 'sequelize'
import {
    A_BirthdayModel,
    A_RoleModel,
    A_RolesCategorieModel,
    A_CityModel,
    A_TwitchModel
} from '../models/agent.model.js'
import {
    CS_CardModel,
    CS_LeaderboardModel,
    CS_PlayerModel
} from '../models/cubestalker.model.js'
import {
    EmbedBuilder,
    userMention,
    hyperlink,
    Guild,
    TextChannel,
    GuildMember
} from 'discord.js'
import { City } from './city.js'
import {
    GameLeaderboard,
    Leaderboards,
    PlayerData,
    PlayerProgress,
    PlayerRanking
} from './bsleaderboard.js'
import { Leaderboard } from './leaderboard.js'
import { CubeStalker, MemberCardStatus } from './cubestalker.js'
import config from '../config.json' assert { type: 'json' }
import Logger from '../utils/logger.js'

interface RoleModelWithCategoryName {
    id: number
    categoryId: number
    name: string
    multiple: boolean
    categoryName: string
}

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
        const userBirthday = await A_BirthdayModel.findOne({
            where: { memberId },
            raw: true
        })
        return userBirthday
            ? new Date(userBirthday.date).toLocaleDateString()
            : null
    }

    public static async setBirthday(memberId: string, date: string | null) {
        if (date !== null) {
            const userBirthday = await A_BirthdayModel.findOne({
                where: { memberId }
            })

            if (userBirthday) {
                userBirthday.date = date
                await userBirthday.save()
            } else {
                await A_BirthdayModel.create({
                    memberId,
                    date
                })
            }
        } else {
            await A_BirthdayModel.destroy({
                where: { memberId }
            })
        }
    }

    public static async getRoles(member: GuildMember) {
        const memberRoles = member.roles.cache

        const roleList = (await A_RoleModel.findAll({
            include: [
                {
                    model: A_RolesCategorieModel,
                    attributes: []
                }
            ],
            attributes: [
                'id',
                'name',
                'multiple',
                [Sequelize.literal('`roles_category`.`name`'), 'categoryName']
            ],
            raw: true
        })) as unknown as RoleModelWithCategoryName[]

        const userRoleList: UserRole[] = []
        for (const role of roleList) {
            const category = userRoleList.find(
                (rl) => rl.categoryName === role.categoryName
            )
            const checked = memberRoles.find((mr) => mr.name === role.name)
                ? true
                : false
            if (!category) {
                userRoleList.push({
                    categoryName: role.categoryName,
                    roles: [
                        {
                            id: role.id,
                            name: role.name,
                            multiple: role.multiple,
                            checked
                        }
                    ]
                })
            } else {
                category.roles.push({
                    id: role.id,
                    name: role.name,
                    multiple: role.multiple,
                    checked
                })
            }
        }

        return userRoleList
    }

    public static async setRoles(member: GuildMember, roles: string[]) {
        const guildRoles = member.guild.roles.cache
        const roleList = (await A_RoleModel.findAll({
            include: [
                {
                    model: A_RolesCategorieModel,
                    attributes: []
                }
            ],
            attributes: [
                'id',
                'categoryId',
                'name',
                'multiple',
                [Sequelize.literal('`roles_category`.`name`'), 'categoryName']
            ],
            raw: true
        })) as unknown as RoleModelWithCategoryName[]
        const assignableRoles = guildRoles.filter((gr) =>
            roleList.find((rl) => rl.name === gr.name)
        )
        const currentMemberRoles = member.roles.cache.filter(
            (ur) => !assignableRoles.find((ar) => ar.id === ur.id)
        )

        const newUserRoles = assignableRoles.filter((ar) => {
            return roles.find((r) => r === ar.name)
        })

        const check: RoleModelWithCategoryName[] = []
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
                    throw new SettingsError(
                        `Vous pouvez vous assigner qu'un seul rôle pour la catégorie « ${_role.categoryName} »`
                    )
                } else {
                    check.push(_role)
                }
            } else {
                throw new SettingsError(
                    'Impossible de mettre à jour les rôles.'
                )
            }
        }

        const updatedRoles = currentMemberRoles.concat(newUserRoles)
        await member.roles.set(updatedRoles)
    }

    public static async getCity(memberId: string) {
        const city = await A_CityModel.findOne({
            where: { memberId },
            raw: true
        })
        return city
    }

    public static async setCity(memberId: string, city: UserCity | null) {
        if (city !== null) {
            const cityData = await City.getCityById(city.id)
            if (cityData.length === 0)
                throw new SettingsError('Ville introuvable')

            const userCity = await A_CityModel.findOne({
                where: { memberId }
            })

            if (!userCity) {
                await A_CityModel.create({
                    memberId,
                    pays: cityData[0].country,
                    commune: cityData[0].name,
                    coordonnees_gps: `${cityData[0].coordinates.lat},${cityData[0].coordinates.lon}`
                })
            } else {
                userCity.pays = cityData[0].country
                userCity.commune = cityData[0].name
                userCity.coordonnees_gps = `${cityData[0].coordinates.lat},${cityData[0].coordinates.lon}`
                await userCity.save()
            }
        } else {
            await A_CityModel.destroy({
                where: { memberId }
            })
        }
    }

    public static async searchCity(name: string) {
        const results = name.length >= 3 ? await City.getCityList(name) : []
        return results
    }

    public static async getTwitchChannel(memberId: string) {
        const twitch = await A_TwitchModel.findOne({
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
            const userTwitch = await A_TwitchModel.findOne({
                where: { memberId }
            })

            if (!userTwitch) {
                await A_TwitchModel.create({
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
            await A_TwitchModel.destroy({
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
                MemberCardStatus.Preview
            )

        const playerProfiles = await CS_PlayerModel.findAll({
            where: { memberId: member.id },
            raw: true
        })

        const currentPlayerData =
            playerProfiles.length > 0 ? playerProfiles[0] : null
        if (currentPlayerData) {
            const leaderboard =
                currentPlayerData.leaderboard === 'scoresaber'
                    ? Leaderboards.ScoreSaber
                    : Leaderboards.BeatLeader
            const bsLeaderboard = new GameLeaderboard(leaderboard)

            const playerData = await bsLeaderboard.requests.getPlayerData(
                currentPlayerData.playerId
            )
            const oldPlayerLd = await Leaderboard.getPlayer(
                leaderboard,
                member.id
            )
            const playerLd: PlayerRanking = {
                pp: playerData.pp,
                averageRankedAccuracy: playerData.averageRankedAccuracy,
                rank: playerData.rank,
                countryRank: playerData.countryRank,
                serverRankPP: 0,
                serverRankAcc: 0,
                serverLdTotal: 0
            }

            let playerProgress: PlayerProgress | null = null
            if (oldPlayerLd) {
                playerProgress = {
                    rankDiff: playerLd.rank - oldPlayerLd.rank,
                    countryRankDiff:
                        playerLd.countryRank - oldPlayerLd.countryRank,
                    ppDiff: playerLd.pp - oldPlayerLd.pp,
                    accDiff: parseFloat(
                        (
                            parseFloat(
                                playerLd.averageRankedAccuracy.toFixed(2)
                            ) -
                            parseFloat(
                                oldPlayerLd.averageRankedAccuracy.toFixed(2)
                            )
                        ).toFixed(2)
                    ),
                    serverPPDiff: 0,
                    serverAccDiff: 0
                }

                const ld = await CS_LeaderboardModel.findAll({
                    where: { leaderboard: currentPlayerData.leaderboard },
                    order: [['pp', 'ASC']],
                    raw: true
                })

                const _playerLd = ld.find((l) => l.playerId === playerData.id)
                if (_playerLd) {
                    _playerLd.pp = playerData.pp
                    _playerLd.averageRankedAccuracy =
                        playerData.averageRankedAccuracy

                    const serverRankPP = ld
                        .sort((a, b) => b.pp - a.pp)
                        .findIndex(
                            (ld) =>
                                ld.playerId === playerData.id &&
                                ld.leaderboard === currentPlayerData.leaderboard
                        )
                    const serverRankAcc = ld
                        .sort(
                            (a, b) =>
                                b.averageRankedAccuracy -
                                a.averageRankedAccuracy
                        )
                        .findIndex(
                            (ld) =>
                                ld.playerId === playerData.id &&
                                ld.leaderboard === currentPlayerData.leaderboard
                        )

                    if (serverRankPP !== -1 && serverRankAcc !== -1) {
                        playerProgress.serverPPDiff =
                            serverRankPP + 1 - oldPlayerLd.serverRankPP
                        playerProgress.serverAccDiff =
                            serverRankAcc + 1 - oldPlayerLd.serverRankAcc
                    }

                    playerLd.serverRankPP = serverRankPP + 1
                    playerLd.serverRankAcc = serverRankAcc + 1
                    playerLd.serverLdTotal = ld.length
                }
            }

            const card = await CubeStalker.getCard(
                leaderboard,
                member,
                playerData,
                playerLd,
                playerProgress,
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
                pp: 727,
                country: 'FR',
                history: '',
                banned: false,
                averageRankedAccuracy: 69,
                topPP: null
            }
            const playerLd: PlayerRanking = {
                pp: playerData.pp,
                averageRankedAccuracy: playerData.averageRankedAccuracy,
                rank: playerData.rank,
                countryRank: playerData.countryRank,
                serverRankPP: 0,
                serverRankAcc: 0,
                serverLdTotal: 0
            }
            const card = await CubeStalker.getCard(
                leaderboard,
                member,
                playerData,
                playerLd,
                null,
                memberCardImage
            )
            return card
        }
    }

    public static async getCardStatus(memberId: string) {
        const card = await CS_CardModel.findOne({
            where: { memberId }
        })
        return card ? card.status : null
    }

    public static async updateCardStatus(
        memberId: string,
        status: MemberCardStatus
    ) {
        const card = await CS_CardModel.findOne({
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
                config.discord.channels.logs
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
            config.discord.channels.logs
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
