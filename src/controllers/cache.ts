import NodeCache from 'node-cache'
import { APIUser, APIGuildMember } from 'discord-api-types/v10'

const cache = new NodeCache({ stdTTL: 1800 })

export class Cache {
    // Discord cache
    public static getAuthUser(accessToken: string): APIUser | undefined {
        return cache.get(`user_${accessToken}`)
    }

    public static setAuthUser(accessToken: string, user: APIUser): APIUser {
        cache.set(`user_${accessToken}`, user)
        return user
    }

    public static getUser(userId: string): APIUser | undefined {
        return cache.get(`user_${userId}`)
    }

    public static setUser(user: APIUser): APIUser {
        cache.set(`user_${user.id}`, user)
        return user
    }

    public static getMember(userId: string): APIGuildMember | undefined {
        return cache.get(`member_${userId}`)
    }

    public static setMember(
        userId: string,
        member: APIGuildMember
    ): APIGuildMember {
        cache.set(`member_${userId}`, member)
        return member
    }

    public static getMembers(): APIGuildMember[] | undefined {
        return cache.get('members')
    }

    public static setMembers(members: APIGuildMember[]): APIGuildMember[] {
        cache.set('members', members)
        return members
    }
}
