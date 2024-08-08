import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { DiscordClient } from '../controllers/discord.js'
import { Auth, AuthError } from '../controllers/auth.js'

import config from '../config.json' assert { type: 'json' }

export default async (app: FastifyInstance) => {
    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/authorize',
        schema: {
            querystring: z.object({
                state: z.string()
            })
        },
        handler: async (req, res) => {
            const state = req.query.state

            const authUrl = 'https://discord.com/api/oauth2/authorize?'
            const options = new URLSearchParams({
                response_type: 'code',
                client_id: config.discord.client_id,
                scope: 'identify guilds.members.read',
                redirect_uri: config.discord.redirect_uri,
                prompt: 'none',
                state
            }).toString()

            res.send({ authUrl: `${authUrl}${options}` })
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/login',
        schema: {
            body: z.object({
                code: z.string(),
                state: z.string()
            })
        },
        handler: async (req, res) => {
            const { code, state } = req.body

            try {
                const token = await DiscordClient.oauth2TokenExchange(
                    code,
                    state
                )
                const sessionId = await Auth.register(token)

                res.setCookie('sessionId', sessionId, {
                    expires: new Date(Date.now() + 86400 * 30 * 1000),
                    path: '/',
                    httpOnly: true,
                    secure: true,
                    sameSite: 'lax',
                    signed: true
                })

                res.send()
            } catch (error) {
                throw error
            }
        }
    })

    app.post('/logout', async (req, res) => {
        res.clearCookie('sessionId')
        res.send()
    })

    app.get('/@me', async (req, res) => {
        try {
            const sessionId = req.cookies.sessionId
            if (sessionId) {
                const token = await Auth.check(req.unsignCookie(sessionId))
                const user = await DiscordClient.getUserData(token)
                res.send(user)
            } else {
                res.send(null)
            }
        } catch (error) {
            if (error instanceof AuthError) {
                res.status(401).send({ message: error.message })
            } else {
                throw error
            }
        }
    })
}
