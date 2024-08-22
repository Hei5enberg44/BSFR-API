import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import {
    serializerCompiler,
    validatorCompiler
} from 'fastify-type-provider-zod'
import { Client, GatewayIntentBits, Guild, Partials } from 'discord.js'
import { UserData } from './controllers/discord.js'

import config from './config.json' assert { type: 'json' }
import Logger from './utils/logger.js'

// Routes
import userRoutes from './routes/user.js'
import mapRoutes from './routes/map.js'
import youtubeRoutes from './routes/youtube.js'
import rankedleRoutes from './routes/rankedle.js'
import adminRoutes from './routes/admin.js'
import { errorHandler } from './routes/middlewares.js'

declare module 'fastify' {
    export interface FastifyInstance {
        discord: {
            guild: Guild
        }
    }
    export interface FastifyRequest {
        fastify: FastifyInstance
        userData: UserData
    }
}

const app = Fastify()

// CORS
app.register(cors, {
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    origin: ['https://bsaber.fr', 'https://bsaber.weezle.xyz']
})

// Schema validator and serializer
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// Cookies
app.register(cookie, {
    secret: config.app.cookie.secret,
    hook: 'onRequest'
})

// File upload
app.register(multipart, {
    attachFieldsToBody: 'keyValues',
    limits: {
        fileSize: 1024 * 1024 * 1024 * 3
    }
})

// Routes registrations
app.register(userRoutes, { prefix: '/user' })
app.register(mapRoutes, { prefix: '/map' })
app.register(youtubeRoutes, { prefix: '/youtube' })
app.register(rankedleRoutes, { prefix: '/rankedle' })
app.register(adminRoutes, { prefix: '/admin' })

app.addHook('onRequest', (req, res, done) => {
    req.fastify = app
    done()
})

// Error handler
app.setErrorHandler(errorHandler)

// Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    closeTimeout: 5000
})

client.once('ready', async () => {
    const guild = await client.guilds.fetch(config.discord.guild_id)
    await guild.members.fetch()
    await guild.channels.fetch()
    await guild.roles.fetch()
    await guild.bans.fetch()
    await guild.emojis.fetch()
})

client.login(config.discord.bot_token).then(() => {
    const guild = client.guilds.cache.get(config.discord.guild_id) as Guild

    app.decorate('discord', {
        guild
    })

    app.listen({ port: config.app.port }, async (err, address) => {
        if (err) Logger.log('Init', 'ERROR', err.message)
        else Logger.log('Init', 'INFO', 'API démarrée')
    })
})
