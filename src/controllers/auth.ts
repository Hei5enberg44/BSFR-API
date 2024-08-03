import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v10'

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

class AuthRegisterError extends AuthError {
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

class AuthSessionNotFoundError extends AuthError {
    sessionId: string

    constructor(message: string, sessionId: string) {
        super(message)
        this.sessionId = sessionId
        this.name = 'AuthSessionNotFoundError'
        Error.captureStackTrace(this, this.constructor)

        Logger.log('Auth', 'ERROR', `${message} (sessionId: ${sessionId})`)
    }
}

class AuthTokenNotFoundError extends AuthError {
    constructor(message: string) {
        super(message)
        this.name = 'AuthTokenNotFoundError'
        Error.captureStackTrace(this, this.constructor)

        Logger.log('Auth', 'ERROR', message)
    }
}

class AuthSignTokenError extends AuthError {
    token: RESTPostOAuth2AccessTokenResult

    constructor(message: string, token: RESTPostOAuth2AccessTokenResult) {
        super(message)
        this.token = token
        this.name = 'AuthSignTokenError'
        Error.captureStackTrace(this, this.constructor)

        Logger.log(
            'Auth',
            'ERROR',
            `${message} (token: ${JSON.stringify(token)})`
        )
    }
}

class AuthVerifyTokenError extends AuthError {
    token: string

    constructor(message: string, token: string) {
        super(message)
        this.token = token
        this.name = 'AuthVerifyTokenError'
        Error.captureStackTrace(this, this.constructor)

        Logger.log('Auth', 'ERROR', `${message} (token: ${token})`)
    }
}

class AuthRefreshTokenError extends AuthError {
    sessionId: string
    token: RESTPostOAuth2AccessTokenResult

    constructor(
        message: string,
        sessionId: string,
        token: RESTPostOAuth2AccessTokenResult
    ) {
        super(message)
        this.sessionId = sessionId
        this.token = token
        this.name = 'AuthRefreshTokenError'
        Error.captureStackTrace(this, this.constructor)

        Logger.log(
            'Auth',
            'ERROR',
            `${message} (sessionId: ${sessionId}, token: ${JSON.stringify(token)})`
        )
    }
}

export class Auth {
    private static async setToken(token: RESTPostOAuth2AccessTokenResult) {
        try {
            const t = (await new Promise((res, rej) => {
                jwt.sign(
                    token,
                    config.jwt.secret,
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
                throw new AuthSignTokenError(error.message, token)
            else
                throw new AuthSignTokenError(
                    'Impossible de créer le JWT',
                    token
                )
        }
    }

    private static async decodeToken(token: string) {
        try {
            const t = await new Promise((res, rej) => {
                jwt.verify(token, config.jwt.secret, (err, decoded) => {
                    if (err) rej(err)
                    if (typeof token === 'undefined')
                        rej(new Error('Impossible de décoder le JWT'))
                    else res(decoded)
                })
            })
            return t as RESTPostOAuth2AccessTokenResult
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

    private static async updateToken(
        sessionId: string,
        token: RESTPostOAuth2AccessTokenResult
    ) {
        try {
            const newToken = await DiscordClient.oauth2TokenRefresh(token)

            const currentUser = await DiscordClient.getCurrentUser(newToken)

            const userToken = await this.setToken(newToken)
            const tokenExpire =
                Math.floor(Date.now() / 1000) + token.expires_in - 300

            await WS_SessionModel.update(
                {
                    token: userToken,
                    expire: new Date(tokenExpire * 1000)
                },
                {
                    where: {
                        sessionId
                    }
                }
            )

            Logger.log(
                'Auth',
                'INFO',
                `Le token de l'utilisateur ${currentUser.username} a été actualisé`
            )

            return newToken
        } catch (error) {
            throw new AuthRefreshTokenError(
                "Impossible d'actualiser le token de l'utilisateur",
                sessionId,
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
            const userToken = await this.setToken(token)
            const tokenExpire =
                Math.floor(Date.now() / 1000) + token.expires_in - 300

            await WS_SessionModel.create({
                sessionId,
                token: userToken,
                expire: new Date(tokenExpire * 1000)
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

    public static async check(sessionId: string) {
        const session = await WS_SessionModel.findOne({
            where: {
                sessionId
            }
        })

        if (!session) {
            throw new AuthSessionNotFoundError(
                'Identifiant de session introuvable',
                sessionId
            )
        }

        if (!session.token) {
            throw new AuthTokenNotFoundError('Token de session invalide')
        }

        const decodedToken = await this.decodeToken(session.token)

        if (new Date() > session.expire)
            return await this.updateToken(sessionId, decodedToken)

        return decodedToken
    }
}
