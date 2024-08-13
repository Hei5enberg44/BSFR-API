import { Sequelize } from 'sequelize'
import {
    A_BirthdayModel,
    A_RoleModel,
    A_RolesCategorieModel,
    A_CityModel,
    A_TwitchModel
} from '../models/agent.model.js'
import { DiscordClient } from './discord.js'
import { City } from './city.js'

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

    public static async setBirthday(memberId: string, date: Date | null) {
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

    static async getRoles(memberId: string) {
        const member = await DiscordClient.getGuildMember(memberId)
        if (!member) return []

        const guildRoles = await DiscordClient.getGuildRoles()
        const memberRoles = member.roles.map((mr) =>
            guildRoles.find((gr) => gr.id === mr)
        )

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
            const checked = memberRoles.find((mr) => mr?.name === role.name)
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

    static async setRoles(memberId: string, roles: string[]) {
        const member = await DiscordClient.getGuildMember(memberId)
        if (!member) throw new SettingsError('Membre Discord introuvable')

        const guildRoles = await DiscordClient.getGuildRoles()
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
        const assignableRoles = guildRoles.filter(gr => roleList.find(rl => rl.name === gr.name))
        const currentUserRoles = member.roles.filter(ur => !assignableRoles.find(ar => ar.id === ur))

        const newUserRoles = assignableRoles.filter(ar => {
            return roles.find(r => r === ar.name)
        })

        const check: RoleModelWithCategoryName[] = []
        for(const role of newUserRoles) {
            const _role = roleList.find(r => r.name === role.name)
            if(typeof _role !== 'undefined') {
                if(!_role.multiple && check.find(c => c.multiple === _role.multiple && c.categoryId === _role.categoryId)) {
                    throw new SettingsError(`Vous pouvez vous assigner qu'un seul rôle pour la catégorie « ${_role.categoryName} »`)
                } else {
                    check.push(_role)
                }
            } else {
                throw new SettingsError('Impossible de mettre à jour les rôles.')
            }
        }

        const updatedRoles = currentUserRoles.concat(newUserRoles.map(nur => nur.id))

        if(updatedRoles.length > 0) {
            await DiscordClient.modifyGuildMember(member.user.id, {
                roles: updatedRoles
            })
        }
    }

    static async getCity(memberId: string) {
        const city = await A_CityModel.findOne({
            where: { memberId },
            raw: true
        })
        return city
    }

    static async setCity(memberId: string, city: UserCity | null) {
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

    static async searchCity(name: string) {
        const results = name.length >= 3 ? await City.getCityList(name) : []
        return results
    }

    static async getTwitchChannel(memberId: string) {
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

    static async setTwitchChannel(
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
}
