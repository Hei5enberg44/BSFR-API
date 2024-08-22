import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { authCheck } from './middlewares.js'

import { Rankedle } from '../controllers/rankedle.js'

export default async (app: FastifyInstance) => {
    app.route({
        method: 'GET',
        url: '/current',
        onRequest: authCheck,
        handler: async (req, res) => {
            const userData = req.userData
            const current = await Rankedle.getCurrentRankedle()
            const result = current
                ? await Rankedle.getResult(current, userData.id)
                : null
            await new Promise((res) => setTimeout(res, 1000))
            res.send(current)
        }
    })

    app.route({
        method: 'GET',
        url: '/play',
        onRequest: authCheck,
        handler: async (req, res) => {
            const userData = req.userData
            const { head, file } = await Rankedle.playRequest(userData.id)
            res.raw.writeHead(200, head)
            file.pipe(res.raw)
        }
    })

    app.route({
        method: 'GET',
        url: '/ranking',
        onRequest: authCheck,
        handler: async (req, res) => {
            const ranking = await Rankedle.getRanking(app.discord.guild)
            res.send(ranking)
        }
    })

    app.route({
        method: 'GET',
        url: '/stats',
        onRequest: authCheck,
        handler: async (req, res) => {
            const userData = req.userData
            const stats = await Rankedle.getUserStats(userData.id)
            res.send(stats)
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/history',
        schema: {
            querystring: z.object({
                first: z.coerce.number(),
                rows: z.coerce.number()
            })
        },
        onRequest: authCheck,
        handler: async (req, res) => {
            const { first, rows } = req.query
            const userData = req.userData
            const history = await Rankedle.getRankedleHistory(
                userData.id,
                first,
                rows
            )
            res.send(history)
        }
    })
}
