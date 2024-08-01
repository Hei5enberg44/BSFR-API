import { FastifyInstance } from 'fastify'
import { YouTube } from '../controllers/youtube.js'

export default async (app: FastifyInstance) => {
    app.get('/getLastVideo', async (req, res) => {
        const lastVideo = await YouTube.getLastVideo()
        res.send(lastVideo ? {
            videoId: lastVideo.videoId,
            publishedAt: lastVideo.publishedAt,
            title: lastVideo.title
        } : null)
    })
}