import { Sequelize } from 'sequelize'
import {
    A_BirthdayModel,
    A_RoleModel,
    A_RolesCategorieModel,
    A_CityModel
} from '../models/agent.model.js'
import { DiscordClient } from './discord.js'
import { City } from './city.js'

interface RoleModelWithCategoryName {
    id: number
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

    static async getMemberRoles(memberId: string) {
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
}
