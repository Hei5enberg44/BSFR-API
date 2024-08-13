import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { DiscordClient } from '../controllers/discord.js'
import { Auth, AuthError } from '../controllers/auth.js'
import { Settings, SettingsError } from '../controllers/settings.js'
import { authCheck } from './middlewares.js'

import Logger from '../utils/logger.js'
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
            try {
                const { code, state } = req.body
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

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/getBirthday',
        onRequest: authCheck,
        handler: async (req, res) => {
            try {
                const user = await DiscordClient.getCurrentUser(req.token)
                const date = await Settings.getBirthday(user.id)
                res.send({ date })
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500).send({ message: error.message })
                } else {
                    throw error
                }
            }
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/setBirthday',
        schema: {
            body: z.object({
                date: z.nullable(z.coerce.date())
            })
        },
        onRequest: authCheck,
        handler: async (req, res) => {
            try {
                const { date } = req.body
                const user = await DiscordClient.getCurrentUser(req.token)
                await Settings.setBirthday(user.id, date)
                Logger.log(
                    'Settings',
                    'INFO',
                    `L'utilisateur ${user.username} a mis à jour sa date de naissance`
                )
                res.send()
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500).send({ message: error.message })
                } else {
                    throw error
                }
            }
        }
    })

    app.route({
        method: 'GET',
        url: '/getRoles',
        onRequest: authCheck,
        handler: async (req, res) => {
            try {
                const user = await DiscordClient.getCurrentUser(req.token)
                const roles = await Settings.getRoles(user.id)
                res.send(roles)
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500).send({ message: error.message })
                } else {
                    throw error
                }
            }
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/setRoles',
        schema: {
            body: z.object({
                roles: z.array(z.string())
            })
        },
        onRequest: authCheck,
        handler: async (req, res) => {
            try {
                const { roles } = req.body
                const user = await DiscordClient.getCurrentUser(req.token)
                await Settings.setRoles(user.id, roles)
                Logger.log(
                    'Settings',
                    'INFO',
                    `L'utilisateur ${user.username} a mis à jour ses rôles`
                )
                res.send()
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500).send({ message: error.message })
                } else {
                    throw error
                }
            }
        }
    })

    app.route({
        method: 'GET',
        url: '/getCity',
        onRequest: authCheck,
        handler: async (req, res) => {
            try {
                const user = await DiscordClient.getCurrentUser(req.token)
                const city = await Settings.getCity(user.id)
                res.send(
                    city
                        ? {
                              name: `${city.commune} (${city.pays})`
                          }
                        : null
                )
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500).send({ message: error.message })
                } else {
                    throw error
                }
            }
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/setCity',
        schema: {
            body: z.object({
                city: z.nullable(
                    z.object({
                        id: z.string(),
                        name: z.string()
                    })
                )
            })
        },
        onRequest: authCheck,
        handler: async (req, res) => {
            try {
                const { city } = req.body
                const user = await DiscordClient.getCurrentUser(req.token)
                await Settings.setCity(user.id, city)
                Logger.log(
                    'Settings',
                    'INFO',
                    `L'utilisateur ${user.username} a mis à jour sa ville`
                )
                res.send()
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500).send({ message: error.message })
                } else {
                    throw error
                }
            }
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/searchCity',
        schema: {
            querystring: z.object({
                s: z.string()
            })
        },
        onRequest: authCheck,
        handler: async (req, res) => {
            try {
                const search = req.query.s
                const result =
                    search.length >= 3 ? await Settings.searchCity(search) : []
                res.send(result)
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500).send({ message: error.message })
                } else {
                    throw error
                }
            }
        }
    })

    app.route({
        method: 'GET',
        url: '/getTwitchChannel',
        onRequest: authCheck,
        handler: async (req, res) => {
            try {
                const user = await DiscordClient.getCurrentUser(req.token)
                const twitchChannel = await Settings.getTwitchChannel(user.id)
                res.send(twitchChannel)
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500).send({ message: error.message })
                } else {
                    throw error
                }
            }
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/setTwitchChannel',
        schema: {
            body: z.object({
                channelName: z.nullable(z.string())
            })
        },
        onRequest: authCheck,
        handler: async (req, res) => {
            try {
                const { channelName } = req.body
                const user = await DiscordClient.getCurrentUser(req.token)
                await Settings.setTwitchChannel(user.id, channelName)
                Logger.log(
                    'Settings',
                    'INFO',
                    `L'utilisateur ${user.username} a mis à jour sa chaîne Twitch`
                )
                res.send()
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500).send({ message: error.message })
                } else {
                    throw error
                }
            }
        }
    })
}
