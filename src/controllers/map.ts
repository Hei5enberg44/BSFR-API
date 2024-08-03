import { DiscordClient } from './discord.js'
import { A_CitieModel } from '../models/agent.model.js'

export class InteractiveMap {
    public static async getMembersCity() {
        const membersCity = []

        const members = await DiscordClient.getGuildMembers()
        const cities = await A_CitieModel.findAll({ raw: true })

        for (const city of cities) {
            const memberId = city.memberId
            const member = members.find((m) => m.user.id === memberId)

            if (member) {
                const user = member.user
                const username = DiscordClient.getUserNick(user)

                const coords = city.coordonnees_gps
                const countryName = city.pays
                const cityName = city.commune

                membersCity.push({
                    username,
                    avatarURL: DiscordClient.getUserAvatar(user),
                    coords,
                    countryName,
                    cityName
                })
            }
        }

        return membersCity
    }
}
