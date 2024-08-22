import { Guild } from 'discord.js'
import { A_CityModel } from '../models/agent.model.js'

export class InteractiveMap {
    public static async getMembersCity(guild: Guild) {
        const membersCity = []

        const cities = await A_CityModel.findAll({ raw: true })

        for (const city of cities) {
            const memberId = city.memberId
            const member = guild.members.cache.get(memberId)

            if (member) {
                const username = member.displayName

                const coords = city.coordonnees_gps
                const countryName = city.pays
                const cityName = city.commune

                membersCity.push({
                    username,
                    avatarURL: member.displayAvatarURL({
                        extension: 'webp',
                        size: 128
                    }),
                    coords,
                    countryName,
                    cityName
                })
            }
        }

        return membersCity
    }
}
