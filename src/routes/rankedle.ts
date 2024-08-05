import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { DiscordClient } from '../controllers/discord.js'
import { authCheck } from './middlewares.js'

import { Rankedle } from '../controllers/rankedle.js'

export default async (app: FastifyInstance) => {
    app.route({
        method: 'GET',
        url: '/current',
        onRequest: authCheck,
        handler: async (req, res) => {
            const user = await DiscordClient.getUserData(req.token)
            const current = await Rankedle.getCurrentRankedle()
            const result = current
                ? await Rankedle.getResult(current, user.id)
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
            const user = await DiscordClient.getUserData(req.token)
            const { head, file } = await Rankedle.playRequest(user)
            res.raw.writeHead(200, head)
            file.pipe(res.raw)
        }
    })

    app.route({
        method: 'GET',
        url: '/ranking',
        onRequest: authCheck,
        handler: async (req, res) => {
            const ranking = await Rankedle.getRanking()
            res.send(ranking)
        }
    })

    app.route({
        method: 'GET',
        url: '/stats',
        onRequest: authCheck,
        handler: async (req, res) => {
            const user = await DiscordClient.getCurrentUser(req.token)
            const stats = await Rankedle.getUserStats(user.id)
            res.send(stats)
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/history',
        schema: {
            querystring: z.object({
                first: z.string(),
                rows: z.string()
            })
        },
        onRequest: authCheck,
        handler: async (req, res) => {
            const { first, rows } = req.query
            const user = await DiscordClient.getCurrentUser(req.token)
            const history = await Rankedle.getRankedleHistory(
                user.id,
                parseInt(first),
                parseInt(rows)
            )
            res.send(history)
        }
    })
}
