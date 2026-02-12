import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { BeatSaber } from '../controllers/beatsaber.js'

export default async (app: FastifyInstance) => {
    app.route({
        method: 'GET',
        url: '/versions',
        handler: async (req, res) => {
            const versions = await BeatSaber.getVersions()
            return versions
        }
    })

    app.withTypeProvider<ZodTypeProvider>().route({
        method: 'GET',
        url: '/download/:version(^\\d\\.\\d{1,2}\\.\\d{1,2}$)',
        schema: {
            params: z.object({
                version: z.string()
            })
        },
        handler: async (req, res) => {
            const { version } = req.params
            const { stream, size } = await BeatSaber.downloadVersion(version)
            res.header('content-type', 'application/zip')
            res.header(
                'content-disposition',
                `attachment; filename=Beat Saber ${version}.zip`
            )
            res.header('content-length', size)
            return stream
        }
    })
}
