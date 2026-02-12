import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import session from '@fastify/session'
import sequelizeSession from 'connect-session-sequelize'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import {
    serializerCompiler,
    validatorCompiler
} from 'fastify-type-provider-zod'
import { Client, GatewayIntentBits, Guild, Partials } from 'discord.js'
import { UserData } from './controllers/discord.js'

// Databases
import { agentDB } from './databases/agent.database.js'
import { cubestalkerDB } from './databases/cubestalker.database.js'
import { rankedleDB } from './databases/rankedle.database.js'
import { websiteDB, websiteDBLegacy } from './databases/website.database.js'

import config from '../config.json' with { type: 'json' }
import Logger from './utils/logger.js'

// Routes
import bsRoutes from './routes/beatsaber.js'
import userRoutes from './routes/user.js'
import mapRoutes from './routes/map.js'
import youtubeRoutes from './routes/youtube.js'
import rankedleRoutes from './routes/rankedle.js'
import adminRoutes from './routes/admin.js'
import agentRoutes from './routes/agent.js'
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
    interface Session {
        token: string
    }
}

const app = Fastify()

// CORS
await app.register(cors, {
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    origin: ['https://beatsaber.fr', 'https://dev.beatsaber.fr']
})

// Schema validator and serializer
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// Cookies
await app.register(cookie)

// Sessions
const SequelizeStore = sequelizeSession(session.Store)
const sessionStore = new SequelizeStore({
    db: websiteDBLegacy
})
await websiteDB.authenticate()
await app.register(session, {
    secret: config.app.cookie.secret,
    cookieName: 'sid',
    cookie: {
        path: '/',
        maxAge: 60 * 60 * 24 * 30 * 1000, // 30 days,
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
    },
    store: sessionStore
})
await sessionStore.sync()

// File upload
await app.register(multipart, {
    attachFieldsToBody: 'keyValues',
    limits: {
        fileSize: 1024 * 1024 * 1024 * 3
    }
})

// Rate limit
await app.register(rateLimit, {
    hook: 'onRequest',
    max: 100,
    timeWindow: '30 seconds',
    allowList: ['127.0.0.1', '::1']
})

// Routes registrations
app.register(bsRoutes, { prefix: '/beatsaber' })
app.register(userRoutes, { prefix: '/user' })
app.register(mapRoutes, { prefix: '/map' })
app.register(youtubeRoutes, { prefix: '/youtube' })
app.register(rankedleRoutes, { prefix: '/rankedle' })
app.register(adminRoutes, { prefix: '/admin' })
app.register(agentRoutes, { prefix: '/agent' })

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
        GatewayIntentBits.GuildExpressions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    closeTimeout: 5_000,
    rest: {
        retries: 5,
        timeout: 300_000
    }
})

client.once('clientReady', async () => {
    const guild = await client.guilds.fetch(config.discord.guild.id)
    await guild.members.fetch()
    await guild.channels.fetch()
    await guild.roles.fetch()
    await guild.bans.fetch()
    await guild.emojis.fetch()
})

client.login(config.discord.bot_token).then(async () => {
    const guild = client.guilds.cache.get(config.discord.guild.id) as Guild

    app.decorate('discord', {
        guild
    })

    // Connect to databases
    await agentDB.authenticate()
    await cubestalkerDB.authenticate()
    await rankedleDB.authenticate()
    await websiteDB.authenticate()

    app.listen({ port: config.app.port }, (err, address) => {
        if (err) Logger.log('Init', 'ERROR', err.message)
        else Logger.log('Init', 'INFO', 'API démarrée')
    })
})
