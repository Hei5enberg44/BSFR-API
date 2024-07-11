import { FastifyInstance } from 'fastify'
import youtube from '../controllers/youtube.js'

export default async (app: FastifyInstance) => {
    app.get('/getLastVideo', async (req, res) => {
        const lastVideo = await youtube.getLastVideo()
        res.send(lastVideo ? {
            videoId: lastVideo.videoId,
            publishedAt: lastVideo.publishedAt,
            title: lastVideo.title
        } : null)
    })
}