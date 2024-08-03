import { FastifyInstance } from 'fastify'
import { InteractiveMap } from '../controllers/map.js'

export default async (app: FastifyInstance) => {
    app.get('/membersCity', async (req, res) => {
        const cities = await InteractiveMap.getMembersCity()
        res.send(cities)
    })
}
