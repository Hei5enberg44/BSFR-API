import { GuildMember } from 'discord.js'
import { Leaderboards } from './gameLeaderboard.js'
import config from '../../config.json' with { type: 'json' }

export default class Roles {
    /**
     * Récupère la liste des rôles de pp d'un membre
     * @param leaderboard nom du leaderboard (scoresaber | beatleader)
     * @param member membre Discord
     * @returns rôle de pp le plus élevé du membre
     */
    private static getMemberPpRoles(
        leaderboard: Leaderboards,
        member: GuildMember
    ) {
        const ldRoles =
            leaderboard === Leaderboards.ScoreSaber
                ? config.discord.guild.roles.pp.scoresaber
                : config.discord.guild.roles.pp.beatleader
        const roles = member.roles.cache.filter((role) =>
            Object.values(ldRoles).includes(role.id)
        )
        return roles
    }

    /**
     * Récupère la couleur du rôle de pp le plus élevé d'un membre
     * @param leaderboard nom du leaderboard (scoresaber | beatleader)
     * @param member membre Discord
     */
    static getMemberPpRoleColor(
        leaderboard: Leaderboards,
        member: GuildMember
    ) {
        const memberPpRoles = this.getMemberPpRoles(leaderboard, member)

        if (memberPpRoles.size > 0) {
            const memberPpRolesSorted = memberPpRoles.sort(
                (r1, r2) =>
                    parseInt(r1.name.replace(/(\s|pp)/, '')) -
                    parseInt(r2.name.replace(/(\s|pp)/, ''))
            )
            return memberPpRolesSorted.last()?.colors.primaryColor ?? null
        }

        return null
    }
}
