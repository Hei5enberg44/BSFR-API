import { createClient, AuthType, FileStat } from 'webdav'
import NodeCache from 'node-cache'

import { AppError } from '../utils/error.js'
import config from '../../config.json' with { type: 'json' }

const cache = new NodeCache({ stdTTL: 3600 })

export class BeatSaber {
    public static async getVersions() {
        try {
            if (cache.has('versions')) return cache.get('versions') as string[]

            const client = createClient(
                `https://${config.kdrive.id}.connect.kdrive.infomaniak.com`,
                {
                    authType: AuthType.Password,
                    username: config.kdrive.email,
                    password: config.kdrive.password
                }
            )

            const files = (await client.getDirectoryContents(
                config.kdrive['beatsaber-dir']
            )) as FileStat[]
            const versions = files
                .filter((file) => {
                    return file.basename.match(
                        /^Beat Saber \d(\.\d{1,2}){2}\.zip$/
                    )
                })
                .map((file) => {
                    return file.basename
                        .replace(/^Beat Saber (.+)\.zip$/, '$1')
                        .split('.')
                })
                .sort((a, b) => {
                    return (
                        (b[0] as any) - (a[0] as any) ||
                        (b[1] as any) - (a[1] as any) ||
                        (b[2] as any) - (a[2] as any)
                    )
                })
                .map((v) => v.join('.'))

            cache.set('versions', versions)

            return versions
        } catch (error) {
            throw new AppError(
                400,
                'ERR_BEATSABER',
                'Bad Request',
                'Récupération des versions de Beat Saber impossible'
            )
        }
    }

    public static async downloadVersion(version: string) {
        try {
            const client = createClient(
                `https://${config.kdrive.id}.connect.kdrive.infomaniak.com`,
                {
                    authType: AuthType.Password,
                    username: config.kdrive.email,
                    password: config.kdrive.password
                }
            )
            const filePath = `${config.kdrive['beatsaber-dir']}Beat Saber ${version}.zip`
            const fileStat = (await client.stat(filePath, {
                details: false
            })) as unknown as FileStat
            const fileStream = client.createReadStream(filePath)
            return {
                stream: fileStream,
                size: fileStat.size
            }
        } catch (error) {
            throw new AppError(
                400,
                'ERR_BEATSABER',
                'Bad Request',
                `Téléchargement de la version ${version} de Beat Saber impossible`
            )
        }
    }
}
