import NodeCache from 'node-cache'
import { APIUser, APIGuildMember } from 'discord-api-types/v10'

const cache = new NodeCache({ stdTTL: 300 })

export class Cache {
    // Discord cache
    public static getUser(accessToken: string): APIUser | undefined {
        return cache.get(`user_${accessToken}`)
    }

    public static setUser(accessToken: string, user: APIUser): APIUser {
        cache.set(`user_${accessToken}`, user)
        return user
    }

    public static getMember(userId: string): APIGuildMember | undefined {
        return cache.get(`member_${userId}`)
    }

    public static setMember(userId: string, member: APIGuildMember): APIGuildMember {
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

    // YouTube cache
    public static getLastYouTubeVideo() {
        return cache.get('last_youtube_video')
    }

    public static setLastYouTubeVideo(video: any): any {
        cache.set('last_youtube_video', video)
        return video
    }
}