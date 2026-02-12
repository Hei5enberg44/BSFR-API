import { YoutubeVideoModel } from '../models/agent/youtubeVideo.model.js'

export class YouTube {
    /**
     * Récupère la dernière vidéo YouTube publiée sur la chaîne
     */
    public static async getLastVideo() {
        const video = await YoutubeVideoModel.findOne({
            order: [['publishedAt', 'desc']]
        })

        return video
    }
}
