import jwt, { JwtPayload } from 'jsonwebtoken'
import crypto from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v10'

import { DiscordClient, DiscordClientError } from './discord.js'

import Logger from '../utils/logger.js'
import config from '../config.json' assert { type: 'json' }

export interface DecodedToken extends RESTPostOAuth2AccessTokenResult {
    expiration_date: number,
    iat: number
}

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

const prisma = new PrismaClient()

export class Auth {
    private static async setToken(token: RESTPostOAuth2AccessTokenResult): Promise<string> {
        try {
            const t = await new Promise((res, rej) => {
                jwt.sign({
                    ...token,
                    expiration_date: Math.floor(Date.now() / 1000) + token.expires_in - 60
                }, config.jwt.secret, {
                    algorithm: 'HS256'
                }, (err, token) => {
                    if(err) rej(err)
                    if(typeof token === 'undefined')
                        rej('Échec de création du JWT')
                    else
                        res(token as string)
                })
            }) as string
            return t
        } catch(error) {
            throw new AuthSignTokenError()
        }
    }

    private static async decodeToken(token: string): Promise<DecodedToken> {
        try {
            const t = await new Promise((res, rej) => {
                jwt.verify(token, config.jwt.secret, (err, decoded) => {
                    if(err) rej(err)
                    if(typeof token === 'undefined')
                        rej('Impossible de décoder le JWT')
                    else
                        res(decoded as DecodedToken)
                })
            }) as DecodedToken
            return t
        } catch(error) {
            throw new AuthVerifyTokenError()
        }
    }

    public static async register(token: RESTPostOAuth2AccessTokenResult): Promise<string> {
        try {
            const currentUser = await DiscordClient.getCurrentUser(token)
        
            const user = await prisma.users.findFirst({
                where: {
                    userId: currentUser.id
                }
            })

            if(!user) {
                // Création du JWT de l'utilisateur
                const t = await this.setToken(token)
                await prisma.tokens.deleteMany({
                    where: {
                        userId: currentUser.id
                    }
                })
                await prisma.tokens.create({
                    data: {
                        userId: currentUser.id,
                        token: t
                    }
                })

                // Création de l'utilisateur
                const sessionId = crypto.randomUUID()
                await prisma.users.create({
                    data: {
                        userId: currentUser.id,
                        sessionId
                    }
                })
                Logger.log('Auth', 'INFO', `Nouvel utilisateur enregistré: ${currentUser.username}`)
                return sessionId
            }

            return user.sessionId
        } catch(error) {
            if(!(error instanceof DiscordClientError))
                Logger.log('Auth', 'ERROR', (error as Error).message)
            throw new AuthError('Authentication impossible')
        }
    }

    public static async check(sessionId: string) {
        const user = await prisma.users.findFirst({
            where: {
                sessionId
            }
        })

        if(!user) {
            Logger.log('Auth', 'ERROR', 'Identifiant de session invalide')
            throw new AuthSessionNotFoundError()
        }

        const userToken = await prisma.tokens.findFirst({
            where: {
                userId: user.userId
            }
        })

        if(!userToken) {
            Logger.log('Auth', 'ERROR', `Le token pour l'utilisateur ${user.userId} n'existe pas`)
            throw new AuthTokenNotFoundError()
        }

        const decodedToken = await this.decodeToken(userToken.token)

        return decodedToken
    }
}