import NodeCache from 'node-cache'
import { APIUser, APIGuildMember } from 'discord-api-types/v10'

const cache = new NodeCache({ stdTTL: 3600 })

interface CachedUsers {
    [key: string]: APIUser | null
}

interface CachedMembers {
    [key: string]: APIGuildMember | null
}

export class Cache {
    // Discord cache
    public static getAuthUser(accessToken: string): APIUser | undefined {
        return cache.get(`user_${accessToken}`)
    }

    public static setAuthUser(accessToken: string, user: APIUser): APIUser {
        cache.set(`user_${accessToken}`, user)
        return user
    }

    public static getUser(userId: string): APIUser | null | undefined {
        const cachedUsers = cache.get('users') as CachedUsers
        return Object.hasOwn(cachedUsers, userId) ? cachedUsers[userId] : undefined
    }

    public static setUser(
        userId: string,
        user: APIUser | undefined
    ): APIUser | null {
        cache.set('users', {
            ...cache.get('users') as CachedUsers,
            [userId]: user ?? null
        })
        return user ?? null
    }

    public static getUsers(): APIUser[] | undefined {
        if (!cache.has('users')) return undefined
        const users: APIUser[] = []
        const cachedUsers = cache.get('users') as CachedUsers
        for (const [, user] of Object.entries(cachedUsers))
            if (user !== null && typeof user !== 'undefined') users.push(user)
        return users
    }

    public static setUsers(users: APIUser[]): APIUser[] {
        const cachedUsers: CachedUsers = {}
        users.forEach((u) => {
            cachedUsers[u.id] = u
        })
        cache.set('users', cachedUsers)
        return users
    }

    public static getMember(userId: string): APIGuildMember | null | undefined {
        const cachedMembers = cache.get('members') as CachedMembers
        return Object.hasOwn(cachedMembers, userId) ? cachedMembers[userId] : undefined
    }

    public static setMember(
        userId: string,
        member: APIGuildMember | undefined
    ): APIGuildMember | null {
        cache.set('members', {
            ...cache.get('members') as CachedMembers,
            [userId]: member ?? null
        })
        return member ?? null
    }

    public static getMembers(): APIGuildMember[] | undefined {
        if (!cache.has('members')) return undefined
        const members: APIGuildMember[] = []
        const cachedMembers = cache.get('members') as CachedMembers
        for (const [, member] of Object.entries(cachedMembers))
            if (member !== null && typeof member !== 'undefined')
                members.push(member)
        return members
    }

    public static setMembers(members: APIGuildMember[]): APIGuildMember[] {
        const cachedMembers: CachedMembers = {}
        members.forEach((m) => {
            cachedMembers[m.user.id] = m
        })
        cache.set('members', cachedMembers)
        return members
    }
}
