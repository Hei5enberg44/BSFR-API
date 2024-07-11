import NodeCache from 'node-cache'
import { APIUser } from 'discord-api-types/v10'

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

    // YouTube cache
    public static getLastYouTubeVideo() {
        return cache.get('last_youtube_video')
    }

    public static setLastYouTubeVideo(video: any): any {
        cache.set('last_youtube_video', video)
        return video
    }
}