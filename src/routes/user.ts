import { GuildMember } from 'discord.js'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import sharp from 'sharp'

import { DiscordClient } from '../controllers/discord.js'
import { Auth } from '../controllers/auth.js'
import { Settings, SettingsError } from '../controllers/settings.js'
import { CardStatus } from '../models/cubestalker/card.model.js'
import { authCheck, requireNitro } from './middlewares.js'

import { Mime } from '../utils/mime.js'
import Logger from '../utils/logger.js'
import config from '../../config.json' with { type: 'json' }

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

            return { authUrl: `${authUrl}${options}` }
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
                await Auth.login(req, code, state)
                return
            } catch (error) {
                throw error
            }
        }
    })

    app.post('/logout', async (req, res) => {
        await req.session.destroy()
        return
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/@me',
        handler: async (req, res) => {
            const sessionToken = req.session.get('token')
            if (!sessionToken) return null

            const userId = await Auth.check(req.session.get('token'))
            const userData = await DiscordClient.getUserData(
                app.discord.guild,
                userId
            )
            return userData
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/birthday',
        preValidation: authCheck,
        handler: async (req, res) => {
            try {
                const userData = req.userData
                const date = await Settings.getBirthday(userData.id)
                return { date }
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
        url: '/birthday',
        schema: {
            body: z.object({
                date: z.nullable(z.string())
            })
        },
        preValidation: authCheck,
        handler: async (req, res) => {
            try {
                const { date } = req.body
                const userData = req.userData
                await Settings.setBirthday(userData.id, date)
                Logger.log(
                    'Settings',
                    'INFO',
                    `L'utilisateur ${userData.username} a mis à jour sa date de naissance`
                )
                return { date }
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
        url: '/roles',
        preValidation: authCheck,
        handler: async (req, res) => {
            try {
                const userData = req.userData
                const member = app.discord.guild.members.cache.get(userData.id)
                const roles = member ? await Settings.getRoles(member) : []
                return roles
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500)
                    return { message: error.message }
                } else {
                    throw error
                }
            }
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/roles',
        schema: {
            body: z.object({
                roles: z.array(z.string())
            })
        },
        preValidation: authCheck,
        handler: async (req, res) => {
            try {
                const { roles } = req.body
                const userData = req.userData
                const member = app.discord.guild.members.cache.get(userData.id)
                if (member) {
                    await Settings.setRoles(member, roles)
                    Logger.log(
                        'Settings',
                        'INFO',
                        `L'utilisateur ${userData.username} a mis à jour ses rôles`
                    )
                }
                return
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500)
                    return { message: error.message }
                } else {
                    throw error
                }
            }
        }
    })

    app.route({
        method: 'GET',
        url: '/city',
        preValidation: authCheck,
        handler: async (req, res) => {
            try {
                const userData = req.userData
                const city = await Settings.getCity(userData.id)
                return city ? { name: `${city.city} (${city.country})` } : null
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500)
                    return { message: error.message }
                } else {
                    throw error
                }
            }
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/city',
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
        preValidation: authCheck,
        handler: async (req, res) => {
            try {
                const { city } = req.body
                const userData = req.userData
                await Settings.setCity(userData.id, city)
                Logger.log(
                    'Settings',
                    'INFO',
                    `L'utilisateur ${userData.username} a mis à jour sa ville`
                )
                return
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
        preValidation: authCheck,
        handler: async (req, res) => {
            try {
                const search = req.query.s
                const result =
                    search.length >= 3 ? await Settings.searchCity(search) : []
                return result
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500)
                    return { message: error.message }
                } else {
                    throw error
                }
            }
        }
    })

    app.route({
        method: 'GET',
        url: '/twitchChannel',
        preValidation: authCheck,
        handler: async (req, res) => {
            try {
                const userData = req.userData
                const twitchChannel = await Settings.getTwitchChannel(
                    userData.id
                )
                return twitchChannel
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500)
                    return { message: error.message }
                } else {
                    throw error
                }
            }
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/twitchChannel',
        schema: {
            body: z.object({
                channelName: z.nullable(z.string())
            })
        },
        preValidation: authCheck,
        handler: async (req, res) => {
            try {
                const { channelName } = req.body
                const userData = req.userData
                await Settings.setTwitchChannel(userData.id, channelName)
                Logger.log(
                    'Settings',
                    'INFO',
                    `L'utilisateur ${userData.username} a mis à jour sa chaîne Twitch`
                )
                return
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500)
                    return { message: error.message }
                } else {
                    throw error
                }
            }
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/cardPreview',
        schema: {
            querystring: z.object({
                memberId: z.string().optional()
            })
        },
        preValidation: requireNitro,
        handler: async (req, res) => {
            try {
                const userData = req.userData
                const memberId = req.query.memberId ?? userData.id
                const member = app.discord.guild.members.cache.get(
                    memberId
                ) as GuildMember
                const card = await Settings.getCubeStalkerCard(member)
                return card
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500)
                    return { message: error.message }
                } else {
                    throw error
                }
            }
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/cardPreview',
        schema: {
            body: z.object({
                memberCardImage: z.instanceof(Buffer)
            })
        },
        attachValidation: true,
        preValidation: requireNitro,
        handler: async (req, res) => {
            try {
                const userData = req.userData
                const member = app.discord.guild.members.cache.get(
                    userData.id
                ) as GuildMember

                if (req.validationError)
                    throw new Error('Type de fichier invalide')

                let memberCardImage = req.body.memberCardImage
                const fileType = await Mime.getMimeType(memberCardImage)

                if (!fileType?.mime.match(/^image\/(jpe?g|png|webp)$/))
                    throw new Error(
                        'Type de fichier invalide, types de fichier autorisés: .jpg, .png, .webp'
                    )

                if (memberCardImage.byteLength > 5242880)
                    throw new Error(
                        'Fichier trop lourd, la taille maximale autorisée est de 5 Mo'
                    )

                if (fileType?.mime !== 'image/png')
                    memberCardImage = await sharp(memberCardImage)
                        .png()
                        .resize(1900)
                        .toBuffer()

                const card = await Settings.getCubeStalkerCard(
                    member,
                    memberCardImage
                )
                return card
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500)
                    return { message: error.message }
                } else {
                    throw error
                }
            }
        }
    })

    app.route({
        method: 'POST',
        url: '/card',
        preValidation: requireNitro,
        handler: async (req, res) => {
            try {
                const userData = req.userData
                const status = userData.isAdmin
                    ? CardStatus.Approved
                    : CardStatus.Pending
                const cardStatus = await Settings.getCardStatus(userData.id)

                if (cardStatus !== null && cardStatus === CardStatus.Preview) {
                    const cardId = await Settings.updateCardStatus(
                        userData.id,
                        status
                    )

                    if (cardId && !userData.isAdmin) {
                        const url = await Settings.sendCardRequest(
                            app.discord.guild,
                            userData.id,
                            cardId
                        )
                        Logger.log(
                            'SettingsCardImage',
                            'INFO',
                            `Nouvelle demande d\'approbation reçue pour une image de carte Cube-Stalker: ${url}`
                        )
                    }
                }
                return
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500)
                    return { message: error.message }
                } else {
                    throw error
                }
            }
        }
    })

    app.route({
        method: 'DELETE',
        url: '/card',
        preValidation: requireNitro,
        handler: async (req, res) => {
            try {
                const userData = req.userData
                await Settings.updateCardStatus(userData.id, CardStatus.Preview)
                return
            } catch (error) {
                if (error instanceof SettingsError) {
                    res.status(500)
                    return { message: error.message }
                } else {
                    throw error
                }
            }
        }
    })
}
