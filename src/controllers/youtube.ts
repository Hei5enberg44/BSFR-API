import { A_YoutubeVideoModel } from '../models/agent.model.js'

export class YouTube {
    /**
     * Récupère la dernière vidéo YouTube publiée sur la chaîne
     */
    public static async getLastVideo() {
        const video = await A_YoutubeVideoModel.findOne({
            order: [['publishedAt', 'desc']]
        })

        return video
    }
}
