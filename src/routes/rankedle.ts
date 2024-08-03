import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { DiscordClient } from '../controllers/discord.js'
import { Auth, AuthError } from '../controllers/auth.js'

import { Rankedle } from '../controllers/rankedle.js'

import config from '../config.json' assert { type: 'json' }

export default async (app: FastifyInstance) => {
    app.get('/current', async (req, res) => {
        try {
            const sessionId = req.cookies.sessionId
            if (!sessionId) throw new Error('Cookies invalides')

            const token = await Auth.check(sessionId)
            const user = await DiscordClient.getUserData(token)

            const current = await Rankedle.getCurrentRankedle()
            const result = current
                ? await Rankedle.getResult(current, user.id)
                : null

            await new Promise((res) => setTimeout(res, 1000))

            res.send(current)
        } catch (error) {
            if (error instanceof AuthError) {
                res.status(401).send({ message: error.message })
            } else {
                throw error
            }
        }
    })

    app.get('/play', async (req, res) => {
        try {
            const sessionId = req.cookies.sessionId
            if (!sessionId) throw new Error('Cookies invalides')

            const token = await Auth.check(sessionId)
            const user = await DiscordClient.getUserData(token)

            const { head, file } = await Rankedle.playRequest(user)

            res.raw.writeHead(200, head)
            file.pipe(res.raw)
        } catch (error) {
            if (error instanceof AuthError) {
                res.status(401).send({ message: error.message })
            } else {
                throw error
            }
        }
    })

    app.get('/ranking', async (req, res) => {
        try {
            const sessionId = req.cookies.sessionId
            if (!sessionId) throw new Error('Cookies invalides')

            await Auth.check(sessionId)

            const ranking = await Rankedle.getRanking()

            // await new Promise(res => setTimeout(res, 1000))

            res.send(ranking)
        } catch (error) {
            if (error instanceof AuthError) {
                res.status(401).send({ message: error.message })
            } else {
                throw error
            }
        }
    })
}
