import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { authCheck, requireAdmin } from './middlewares.js'

import { formatEmoji } from 'discord.js'

import { Admin } from '../controllers/admin.js'
import { Settings } from '../controllers/settings.js'
import { MemberCardStatus } from '../controllers/cubestalker.js'

import Logger from '../utils/logger.js'
import config from '../config.json' assert { type: 'json' }

export default async (app: FastifyInstance) => {
    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/birthdays',
        schema: {
            querystring: z.object({
                first: z.coerce.number(),
                rows: z.coerce.number(),
                sortField: z.string(),
                sortOrder: z.coerce.number(),
                filters: z.string()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { first, rows, sortField, sortOrder, filters } = req.query
            const birthdays = await Admin.getBirthdays(
                app.discord.guild,
                first,
                rows,
                sortField,
                sortOrder,
                filters
            )
            res.send(birthdays)
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/mutes',
        schema: {
            querystring: z.object({
                first: z.coerce.number(),
                rows: z.coerce.number(),
                sortField: z.string(),
                sortOrder: z.coerce.number(),
                filters: z.string()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { first, rows, sortField, sortOrder, filters } = req.query
            const mutes = await Admin.getMutes(
                app.discord.guild,
                first,
                rows,
                sortField,
                sortOrder,
                filters
            )
            res.send(mutes)
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/bans',
        schema: {
            querystring: z.object({
                first: z.coerce.number(),
                rows: z.coerce.number(),
                sortField: z.string(),
                sortOrder: z.coerce.number(),
                filters: z.string()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { first, rows, sortField, sortOrder, filters } = req.query
            const bans = await Admin.getBans(
                app.discord.guild,
                first,
                rows,
                sortField,
                sortOrder,
                filters
            )
            res.send(bans)
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/birthdayMessages',
        schema: {
            querystring: z.object({
                first: z.coerce.number(),
                rows: z.coerce.number(),
                sortField: z.string(),
                sortOrder: z.coerce.number(),
                filters: z.string()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { first, rows, sortField, sortOrder, filters } = req.query
            const birthdayMessages = await Admin.getBirthdayMessages(
                app.discord.guild,
                first,
                rows,
                sortField,
                sortOrder,
                filters
            )
            res.send(birthdayMessages)
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'PUT',
        url: '/birthdayMessage',
        schema: {
            body: z.object({
                message: z.string()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { message } = req.body
            const userData = req.userData
            await Admin.addBirthdayMessage(userData.id, message)
            Logger.log(
                'Admin',
                'INFO',
                `${userData.username} a ajouté un message d'anniversaire`
            )
            res.send()
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'PATCH',
        url: '/birthdayMessage',
        schema: {
            body: z.object({
                id: z.number(),
                message: z.string()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { id, message } = req.body
            const userData = req.userData
            await Admin.modifyBirthdayMessage(id, message)
            Logger.log(
                'Admin',
                'INFO',
                `${userData.username} a modifié un message d'anniversaire`
            )
            res.send()
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'DELETE',
        url: '/birthdayMessage',
        schema: {
            body: z.object({
                id: z.number()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { id } = req.body
            const userData = req.userData
            await Admin.deleteBirthdayMessage(id)
            Logger.log(
                'Admin',
                'INFO',
                `${userData.username} a supprimé un message d'anniversaire`
            )
            res.send()
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/twitchChannels',
        schema: {
            querystring: z.object({
                first: z.coerce.number(),
                rows: z.coerce.number(),
                sortField: z.string(),
                sortOrder: z.coerce.number(),
                filters: z.string()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { first, rows, sortField, sortOrder, filters } = req.query
            const twitchChannels = await Admin.getTwitchChannels(
                app.discord.guild,
                first,
                rows,
                sortField,
                sortOrder,
                filters
            )
            res.send(twitchChannels)
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/cubeStalkerRequests',
        schema: {
            querystring: z.object({
                first: z.coerce.number(),
                rows: z.coerce.number(),
                sortField: z.string(),
                sortOrder: z.coerce.number(),
                filters: z.string()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { first, rows, sortField, sortOrder, filters } = req.query
            const requests = await Admin.getCubeStalkerRequests(
                app.discord.guild,
                first,
                rows,
                sortField,
                sortOrder,
                filters
            )
            res.send(requests)
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/cubeStalkerRequest',
        schema: {
            querystring: z.object({
                id: z.coerce.number()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { id } = req.query
            const request = await Admin.getCubeStalkerRequest(
                app.discord.guild,
                id
            )
            res.send(request)
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/denyCubeStalkerRequest',
        schema: {
            body: z.object({
                memberId: z.string()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { memberId } = req.body
            const requestId = await Settings.updateCardStatus(
                memberId,
                MemberCardStatus.Denied
            )
            const member = app.discord.guild.members.cache.get(memberId)
            if (requestId && member) {
                const authorId = req.userData.id
                await Settings.sendCardApprovalNotification(
                    member,
                    authorId,
                    false
                )
            }
            res.send()
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/approveCubeStalkerRequest',
        schema: {
            body: z.object({
                memberId: z.string()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { memberId } = req.body
            const requestId = await Settings.updateCardStatus(
                memberId,
                MemberCardStatus.Approved
            )
            const member = app.discord.guild.members.cache.get(memberId)
            if (requestId && member) {
                const authorId = req.userData.id
                await Settings.sendCardApprovalNotification(
                    member,
                    authorId,
                    true
                )
            }
            res.send()
        }
    })

    app.route({
        method: 'GET',
        url: '/guildEmojis',
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const emojis = app.discord.guild.emojis.cache.toJSON().map((e) => {
                return {
                    id: e.id,
                    name: e.name,
                    identifier: formatEmoji(e.id, e.animated ?? false),
                    iconURL: e.imageURL({
                        extension: e.animated ? 'gif' : 'webp',
                        size: 64
                    })
                }
            })
            res.send(emojis)
        }
    })
}
