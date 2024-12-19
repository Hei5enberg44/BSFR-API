import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { authCheck } from './middlewares.js'

import { Rankedle } from '../controllers/rankedle.js'

export default async (app: FastifyInstance) => {
    app.route({
        method: 'GET',
        url: '/',
        onRequest: authCheck,
        handler: async (req, res) => {
            const userData = req.userData
            const current = await Rankedle.getCurrentRankedle()
            const stats = await Rankedle.getDailyStats(app.discord.guild)
            const playerScore = current
                ? await Rankedle.getPlayerScore(userData.id)
                : null
            const result = current
                ? await Rankedle.getResult(current, userData.id)
                : null
            res.send({
                current,
                stats,
                playerScore: playerScore,
                result
            })
        }
    })

    app.route({
        method: 'POST',
        url: '/skip',
        onRequest: authCheck,
        handler: async (req, res) => {
            const userData = req.userData
            await Rankedle.skip(app.discord.guild, userData.id)
            res.send()
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/submit',
        schema: {
            body: z.object({
                mapId: z.number()
            })
        },
        onRequest: authCheck,
        handler: async (req, res) => {
            const { mapId } = req.body
            const userData = req.userData
            await Rankedle.submit(app.discord.guild, userData.id, mapId)
            res.send()
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/hint',
        onRequest: authCheck,
        handler: async (req, res) => {
            const userData = req.userData
            const cover = await Rankedle.hintRedeem(userData.id)
            res.send({ hint: cover })
        }
    })

    app.route({
        method: 'GET',
        url: '/share',
        onRequest: authCheck,
        handler: async (req, res) => {
            const userData = req.userData
            const score = await Rankedle.shareScore(userData.id)
            res.send(score)
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/song/waveform',
        schema: {
            querystring: z.object({
                type: z.custom<'base' | 'progress'>().optional(),
                barCount: z.coerce.number().optional(),
                barWidth: z.coerce.number().optional(),
                gap: z.coerce.number().optional()
            })
        },
        onRequest: authCheck,
        handler: async (req, res) => {
            const { type, barCount, barWidth, gap } = req.query
            const wf = Rankedle.getSongWaveform(type, barCount, barWidth, gap)
            res.header('content-type', 'image/png')
            res.send(wf)
        }
    })

    app.route({
        method: 'GET',
        url: '/song/play',
        onRequest: authCheck,
        handler: async (req, res) => {
            const userData = req.userData
            const { head, file } = await Rankedle.play(userData.id)
            res.raw.writeHead(200, head)
            file.pipe(res.raw)
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/song/search',
        schema: {
            querystring: z.object({
                query: z.string()
            })
        },
        onRequest: authCheck,
        handler: async (req, res) => {
            const userData = req.userData
            const { query } = req.query
            const searchResult = await Rankedle.getSongList(
                userData.id,
                decodeURIComponent(query)
            )
            res.send(searchResult)
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
