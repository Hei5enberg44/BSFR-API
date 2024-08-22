import { FastifyInstance } from 'fastify'
import { InteractiveMap } from '../controllers/map.js'
import { authCheck } from './middlewares.js'

export default async (app: FastifyInstance) => {
    app.route({
        method: 'GET',
        url: '/membersCity',
        onRequest: authCheck,
        handler: async (req, res) => {
            const cities = await InteractiveMap.getMembersCity(
                app.discord.guild
            )
            res.send(cities)
        }
    })
}
