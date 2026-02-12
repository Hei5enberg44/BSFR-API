import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { YouTube } from '../controllers/youtube.js'
import { authCheck } from './middlewares.js'

export default async (app: FastifyInstance) => {
    app.route({
        method: 'GET',
        url: '/lastVideo',
        preValidation: authCheck,
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

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/run',
        schema: {
            body: z.object({
                url: z.string().nonempty(),
                description: z.string().nonempty(),
                ldProfile: z.string().nonempty(),
                mapLd: z.string().nonempty(),
                beatsaverUrl: z.string().nonempty(),
                headset: z.number(),
                grip: z.string().nonempty(),
                twitchUrl: z.string(),
                comment: z.string()
            })
        },
        preValidation: authCheck,
        handler: async (req, res) => {
            return null
        }
    })
}
