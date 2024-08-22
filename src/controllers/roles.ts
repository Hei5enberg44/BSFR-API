import { GuildMember } from 'discord.js'

export class Roles {
    private static async getMemberPpRoles(member: GuildMember) {
        const roles = member.roles.cache.filter((role) =>
            role.name.match(/^[0-9\s]+pp$/)
        )
        return roles
    }

    public static async getMemberPpRoleColor(member: GuildMember) {
        const memberPpRoles = await this.getMemberPpRoles(member)
        if (memberPpRoles.size === 0) return null
        const memberPpRolesSorted = memberPpRoles.sort(
            (r1, r2) =>
                parseInt(r1.name.replace(/(\s|pp)/, '')) -
                parseInt(r2.name.replace(/(\s|pp)/, ''))
        )
        return memberPpRolesSorted.last()?.color ?? null
    }
}
