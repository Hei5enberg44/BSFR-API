import jwt from 'jsonwebtoken'
import { FastifyRequest } from 'fastify'

import { DiscordClient } from './discord.js'

import { AppError } from '../utils/error.js'
import Logger from '../utils/logger.js'
import config from '../../config.json' with { type: 'json' }

export class Auth {
    public static async setToken(userId: string) {
        try {
            const t = (await new Promise((res, rej) => {
                jwt.sign(
                    userId,
                    config.app.jwt.secret,
                    { algorithm: 'HS256' },
                    (err, token) => {
                        if (err) rej(err)
                        if (typeof token === 'undefined') rej()
                        else res(token)
                    }
                )
            })) as string
            return t
        } catch (error) {
            throw new AppError(
                401,
                'ERR_UNAUTHORIZED',
                'Unauthorized',
                'La signature du JWT a échouée'
            )
        }
    }

    private static async decodeToken(token: string) {
        try {
            const t = await new Promise((res, rej) => {
                jwt.verify(token, config.app.jwt.secret, (err, decoded) => {
                    if (err) rej(err)
                    if (typeof token === 'undefined') rej()
                    else res(decoded)
                })
            })
            return t as string
        } catch (error) {
            throw new AppError(
                401,
                'ERR_UNAUTHORIZED',
                'Unauthorized',
                'Le décodage du JWT à échoué'
            )
        }
    }

    public static async login(
        req: FastifyRequest,
        code: string,
        state: string
    ): Promise<string> {
        try {
            const token = await DiscordClient.oauth2TokenExchange(code, state)
            const currentUser = await DiscordClient.getCurrentUser(token)
            const sessionToken = await Auth.setToken(currentUser.id)
            req.session.set('token', sessionToken)
            await req.session.save()

            Logger.log(
                'Auth',
                'INFO',
                `L'utilisateur ${currentUser.username} s'est connecté`
            )

            return req.session.sessionId
        } catch (error) {
            throw new AppError(
                401,
                'ERR_UNAUTHORIZED',
                'Unauthorized',
                "Échec de l'authentification"
            )
        }
    }

    public static async check(sessionToken: string | undefined) {
        if (typeof sessionToken === 'undefined')
            throw new AppError(
                401,
                'ERR_UNAUTHORIZED',
                'Unauthorized',
                'Vous devez être connecté pour accéder à cette ressource'
            )
        const userId = await this.decodeToken(sessionToken)
        return userId
    }
}
