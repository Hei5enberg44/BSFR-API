import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import {
    serializerCompiler,
    validatorCompiler
} from 'fastify-type-provider-zod'

import config from './config.json' assert { type: 'json' }

// Routes
import discordRoutes from './routes/discord.js'
import mapRoutes from './routes/map.js'
import youtubeRoutes from './routes/youtube.js'
import rankedleRoutes from './routes/rankedle.js'

const app = Fastify()

// Schema validator and serializer
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// CORS
app.register(cors, {
    methods: ['GET', 'POST'],
    origin: [
        'http://localhost:4200',
        'https://bsaber.fr',
        'https://bsaber.weezle.xyz'
    ],
    allowedHeaders: ['Content-Type']
})

// Cookies
app.register(cookie)

// Routes registrations
app.register(discordRoutes, { prefix: '/discord' })
app.register(mapRoutes, { prefix: '/map' })
app.register(youtubeRoutes, { prefix: '/youtube' })
app.register(rankedleRoutes, { prefix: '/rankedle' })

app.listen({ port: config.app.port }, (err, address) => {
    if (err) {
        app.log.error(err)
    }
})
