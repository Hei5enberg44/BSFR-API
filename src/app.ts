import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'

import config from './config.json' assert { type: 'json' }

// Routes
import discordRoutes from './routes/discord.js'

const app = Fastify()

// Schema validator and serializer
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// CORS
app.register(cors, {
    methods: [ 'GET', 'POST' ],
    origin: [ 'http://localhost:4200', 'https://bsaber.fr', 'https://bsaber.weezle.xyz' ],
    allowedHeaders: [ 'Content-Type' ]
})

// Cookies
app.register(cookie)

// Routes registrations
app.register(discordRoutes, { prefix: '/discord' })


app.listen({ port: config.app.port }, (err, address) => {
    if(err) {
        app.log.error(err)
    }
})