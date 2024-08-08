import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import {
    serializerCompiler,
    validatorCompiler
} from 'fastify-type-provider-zod'

import { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v10'

import config from './config.json' assert { type: 'json' }

// Routes
import discordRoutes from './routes/discord.js'
import mapRoutes from './routes/map.js'
import youtubeRoutes from './routes/youtube.js'
import rankedleRoutes from './routes/rankedle.js'

declare module 'fastify' {
    export interface FastifyRequest {
        token: RESTPostOAuth2AccessTokenResult
    }
}

const app = Fastify()

// CORS
app.register(cors, {
    methods: ['GET', 'POST', 'OPTIONS'],
    origin: [
        'http://localhost:4200',
        'https://bsaber.fr',
        'https://bsaber.weezle.xyz'
    ],
    allowedHeaders: [
        'Authorization',
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept'
    ]
})

// Schema validator and serializer
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// Cookies
app.register(cookie, {
    secret: config.app.cookie.secret,
    hook: 'onRequest'
})

// Routes registrations
app.register(discordRoutes, { prefix: '/discord' })
app.register(mapRoutes, { prefix: '/map' })
app.register(youtubeRoutes, { prefix: '/youtube' })
app.register(rankedleRoutes, { prefix: '/rankedle' })

app.listen({ port: config.app.port }, async (err, address) => {
    if (err) app.log.error(err)
})
