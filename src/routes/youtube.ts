import { FastifyInstance } from 'fastify'
import { YouTube } from '../controllers/youtube.js'
import { authCheck } from './middlewares.js'

export default async (app: FastifyInstance) => {
    app.route({
        method: 'GET',
        url: '/lastVideo',
        onRequest: authCheck,
        handler: async (req, res) => {
            const lastVideo = await YouTube.getLastVideo()
            res.send(
                lastVideo
                    ? {
                          videoId: lastVideo.videoId,
                          publishedAt: lastVideo.publishedAt,
                          title: lastVideo.title
                      }
                    : null
            )
        }
    })
}
