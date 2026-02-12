import { Guild } from 'discord.js'
import { CityModel } from '../models/agent/city.model.js'

export class InteractiveMap {
    public static async getMembersCity(guild: Guild) {
        const membersCity = []

        const cities = await CityModel.findAll({ raw: true })

        for (const city of cities) {
            const memberId = city.memberId
            const member = guild.members.cache.get(memberId)

            if (member) {
                const username = member.displayName

                const coords = city.coordinates
                const countryName = city.country
                const cityName = city.city

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
