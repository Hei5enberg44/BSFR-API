import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v10'
import { UnsignResult } from '@fastify/cookie'

import { DiscordClient } from './discord.js'
import { WS_SessionModel } from '../models/website.model.js'

import Logger from '../utils/logger.js'
import config from '../config.json' assert { type: 'json' }

export class AuthError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'AuthError'
        Error.captureStackTrace(this, this.constructor)
    }
}

export class AuthRegisterError extends AuthError {
    token: RESTPostOAuth2AccessTokenResult

    constructor(message: string, token: RESTPostOAuth2AccessTokenResult) {
        super(message)
        this.token = token
        this.name = 'AuthRegisterError'
        Error.captureStackTrace(this, this.constructor)

        Logger.log(
            'Auth',
            'ERROR',
            `${message} (token: ${JSON.stringify(token)})`
        )
    }
}

export class AuthNoSessionError extends AuthError {
    constructor(message: string) {
        super(message)
        this.name = 'AuthNoSessionError'
        Error.captureStackTrace(this, this.constructor)

        Logger.log('Auth', 'ERROR', `${message}`)
    }
}

export class AuthSessionNotFoundError extends AuthError {
    sessionId: string

    constructor(message: string, sessionId: string) {
        super(message)
        this.sessionId = sessionId
        this.name = 'AuthSessionNotFoundError'
        Error.captureStackTrace(this, this.constructor)

        Logger.log('Auth', 'ERROR', `${message} (sessionId: ${sessionId})`)
    }
}

export class AuthTokenNotFoundError extends AuthError {
    constructor(message: string) {
        super(message)
        this.name = 'AuthTokenNotFoundError'
        Error.captureStackTrace(this, this.constructor)

        Logger.log('Auth', 'ERROR', message)
    }
}

export class AuthSignTokenError extends AuthError {
    userId: string

    constructor(message: string, userId: string) {
        super(message)
        this.userId = userId
        this.name = 'AuthSignTokenError'
        Error.captureStackTrace(this, this.constructor)

        Logger.log(
            'Auth',
            'ERROR',
            `${message} (userId: ${JSON.stringify(userId)})`
        )
    }
}

export class AuthVerifyTokenError extends AuthError {
    token: string

    constructor(message: string, token: string) {
        super(message)
        this.token = token
        this.name = 'AuthVerifyTokenError'
        Error.captureStackTrace(this, this.constructor)

        Logger.log('Auth', 'ERROR', `${message} (token: ${token})`)
    }
}

export class Auth {
    private static async setToken(userId: string) {
        try {
            const t = (await new Promise((res, rej) => {
                jwt.sign(
                    userId,
                    config.app.jwt.secret,
                    { algorithm: 'HS256' },
                    (err, token) => {
                        if (err) rej(err)
                        if (typeof token === 'undefined')
                            rej(new Error('Impossible de créer le JWT'))
                        else res(token)
                    }
                )
            })) as string
            return t
        } catch (error) {
            if (error instanceof Error)
                throw new AuthSignTokenError(error.message, userId)
            else
                throw new AuthSignTokenError(
                    'Impossible de créer le JWT',
                    userId
                )
        }
    }

    private static async decodeToken(token: string) {
        try {
            const t = await new Promise((res, rej) => {
                jwt.verify(token, config.app.jwt.secret, (err, decoded) => {
                    if (err) rej(err)
                    if (typeof token === 'undefined')
                        rej(new Error('Impossible de décoder le JWT'))
                    else res(decoded)
                })
            })
            return t as string
        } catch (error) {
            if (error instanceof Error)
                throw new AuthVerifyTokenError(error.message, token)
            else
                throw new AuthVerifyTokenError(
                    'Impossible de décoder le JWT',
                    token
                )
        }
    }

    public static async register(
        token: RESTPostOAuth2AccessTokenResult
    ): Promise<string> {
        try {
            const currentUser = await DiscordClient.getCurrentUser(token)

            const sessionId = crypto.randomUUID()
            const userToken = await this.setToken(currentUser.id)

            await WS_SessionModel.create({
                sessionId,
                token: userToken
            })

            Logger.log(
                'Auth',
                'INFO',
                `L'utilisateur ${currentUser.username} s'est connecté`
            )
            return sessionId
        } catch (error) {
            throw new AuthRegisterError('Authentification impossible', token)
        }
    }

    public static async check(sessionId: UnsignResult) {
        if (sessionId.valid === false || sessionId.value === null)
            throw new AuthNoSessionError('Cookie de session invalide')

        const session = await WS_SessionModel.findOne({
            where: {
                sessionId: sessionId.value
            }
        })

        if (!session)
            throw new AuthSessionNotFoundError(
                'Identifiant de session introuvable',
                sessionId.value
            )
        if (!session.token)
            throw new AuthTokenNotFoundError('Token de session invalide')

        const userId = await this.decodeToken(session.token)
        return userId
    }
}
