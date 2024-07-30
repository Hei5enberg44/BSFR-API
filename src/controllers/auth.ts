import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v10'

import { DiscordClient, DiscordClientError } from './discord.js'
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

export class AuthSessionNotFoundError extends Error {
    constructor() {
        super()
        this.name = 'AuthSessionNotFoundError'
        Error.captureStackTrace(this, this.constructor)
    }
}

export class AuthTokenNotFoundError extends Error {
    constructor() {
        super()
        this.name = 'AuthTokenNotFoundError'
        Error.captureStackTrace(this, this.constructor)
    }
}

export class AuthSignTokenError extends Error {
    constructor() {
        super()
        this.name = 'AuthSignTokenError'
        Error.captureStackTrace(this, this.constructor)
    }
}

export class AuthVerifyTokenError extends Error {
    constructor() {
        super()
        this.name = 'AuthVerifyTokenError'
        Error.captureStackTrace(this, this.constructor)
    }
}

export class AuthRefreshTokenError extends Error {
    constructor() {
        super()
        this.name = 'AuthRefreshTokenError'
        Error.captureStackTrace(this, this.constructor)
    }
}

export class Auth {
    private static async setToken(token: RESTPostOAuth2AccessTokenResult) {
        try {
            const t = await new Promise((res, rej) => {
                jwt.sign(token, config.jwt.secret, { algorithm: 'HS256' },
                    (err, token) => {
                        if(err) rej(err)
                        if(typeof token === 'undefined')
                            rej('Échec de création du JWT')
                        else
                            res(token)
                    })
            }) as string
            return t
        } catch(error) {
            throw new AuthSignTokenError()
        }
    }

    private static async decodeToken(token: string) {
        try {
            const t = await new Promise((res, rej) => {
                jwt.verify(token, config.jwt.secret, (err, decoded) => {
                    if(err) rej(err)
                    if(typeof token === 'undefined')
                        rej('Impossible de décoder le JWT')
                    else
                        res(decoded)
                })
            })
            return t as RESTPostOAuth2AccessTokenResult
        } catch(error) {
            throw new AuthVerifyTokenError()
        }
    }

    private static async updateToken(sessionId: string, token: RESTPostOAuth2AccessTokenResult) {
        try {
            const newToken = await DiscordClient.oauth2TokenRefresh(token)

            const currentUser = await DiscordClient.getCurrentUser(newToken)

            const userToken = await this.setToken(newToken)
            const tokenExpire = Math.floor(Date.now() / 1000) + token.expires_in - 300

            await WS_SessionModel.update({
                token: userToken,
                expire: new Date(tokenExpire * 1000)
            }, {
                where: {
                    sessionId
                }
            })

            Logger.log('Auth', 'INFO', `Le token de l'utilisateur ${currentUser.username} a été actualisé`)

            return newToken
        } catch(error) {
            if(!(error instanceof DiscordClientError))
                Logger.log('Auth', 'ERROR', (error as Error).message)
            throw new AuthRefreshTokenError()
        }
    }

    public static async register(token: RESTPostOAuth2AccessTokenResult): Promise<string> {
        try {
            const currentUser = await DiscordClient.getCurrentUser(token)

            const sessionId = crypto.randomUUID()
            const userToken = await this.setToken(token)
            const tokenExpire = Math.floor(Date.now() / 1000) + token.expires_in - 300

            await WS_SessionModel.create({
                sessionId,
                token: userToken,
                expire: new Date(tokenExpire * 1000)
            })

            Logger.log('Auth', 'INFO', `L'utilisateur ${currentUser.username} s'est connecté`)
            return sessionId
        } catch(error) {
            if(!(error instanceof DiscordClientError))
                Logger.log('Auth', 'ERROR', (error as Error).message)
            throw new AuthError('Authentification impossible')
        }
    }

    public static async check(sessionId: string) {
        const session = await WS_SessionModel.findOne({
            where: {
                sessionId
            }
        })

        if(!session) {
            Logger.log('Auth', 'ERROR', 'Identifiant de session invalide')
            throw new AuthSessionNotFoundError()
        }

        if(!session.token) {
            Logger.log('Auth', 'ERROR', `Token de session invalide`)
            throw new AuthTokenNotFoundError()
        }

        const decodedToken = await this.decodeToken(session.token)

        if(new Date() > session.expire)
            return await this.updateToken(sessionId, decodedToken)

        return decodedToken
    }
}