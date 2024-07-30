import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { DiscordClient, DiscordClientError } from '../controllers/discord.js'
import { Auth, AuthSessionNotFoundError, AuthTokenNotFoundError, AuthVerifyTokenError, AuthRefreshTokenError } from '../controllers/auth.js'

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
                const token = await DiscordClient.oauth2TokenExchange(code, state)
                const sessionId = await Auth.register(token)
                res.send({ sessionId })
            } catch(error) {
                res.status(500).send({ error: 'La connexion à Discord a échouée' })
            }
        }
    })

    app.get('/@me', async (req, res) => {
        try {
            const sessionId = req.cookies.sessionId
            if(!sessionId) throw new Error('Cookies invalides')

            const token = await Auth.check(sessionId)
            const user = await DiscordClient.getCurrentUser(token)
            const appUser = await DiscordClient.getUserData(user)
            res.send(appUser)
        } catch(error) {
            if(error instanceof DiscordClientError || error instanceof AuthSessionNotFoundError || error instanceof AuthTokenNotFoundError || error instanceof AuthVerifyTokenError || error instanceof AuthRefreshTokenError) {
                res.status(401).send({ error: 'Session utilisateur invalide' })
            } else {
                res.status(500).send({ error: 'Impossible de récupérer les informations de l\'utilisateur' })
            }
        }
    })
}