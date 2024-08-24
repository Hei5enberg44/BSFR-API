import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { authCheck, requireAdmin } from './middlewares.js'

import { Agent } from '../controllers/agent.js'

import Logger from '../utils/logger.js'
import config from '../config.json' assert { type: 'json' }

export default async (app: FastifyInstance) => {
    app.route({
        method: 'GET',
        url: '/guildChannels',
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const channels = Agent.getGuildChannels(app.discord.guild)
            res.send(channels)
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/channelMessages',
        schema: {
            querystring: z.object({
                channelId: z.string()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { channelId } = req.query
            const messages = await Agent.getChannelMessages(
                app.discord.guild,
                channelId
            )
            res.send(messages)
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/sendMessage',
        schema: {
            body: z.object({
                channelId: z.string(),
                messageId: z.string().nullable(),
                content: z.string(),
                mention: z.boolean()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { channelId, messageId, content, mention } = req.body
            await Agent.sendMessage(
                app.discord.guild,
                channelId,
                messageId,
                content,
                mention
            )
            res.send()
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'POST',
        url: '/sendReaction',
        schema: {
            body: z.object({
                channelId: z.string(),
                messageId: z.string(),
                emoji: z.string(),
                native: z.boolean()
            })
        },
        onRequest: [authCheck, requireAdmin],
        handler: async (req, res) => {
            const { channelId, messageId, emoji, native } = req.body
            await Agent.sendReaction(
                app.discord.guild,
                channelId,
                messageId,
                emoji,
                native
            )
            res.send()
        }
    })
}
