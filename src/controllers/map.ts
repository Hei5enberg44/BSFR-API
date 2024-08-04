import { DiscordClient } from './discord.js'
import { A_CitieModel } from '../models/agent.model.js'

export class InteractiveMap {
    public static async getMembersCity() {
        const membersCity = []

        const cities = await A_CitieModel.findAll({ raw: true })

        for (const city of cities) {
            const memberId = city.memberId
            const member = await DiscordClient.getGuildMember(memberId)

            if (member) {
                const username = DiscordClient.getMemberNick(member)

                const coords = city.coordonnees_gps
                const countryName = city.pays
                const cityName = city.commune

                membersCity.push({
                    username,
                    avatarURL: DiscordClient.getUserAvatar(member.user),
                    coords,
                    countryName,
                    cityName
                })
            }
        }

        return membersCity
    }
}
