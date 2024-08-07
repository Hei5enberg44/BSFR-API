import { REST, DiscordAPIError, RateLimitError } from '@discordjs/rest'
import {
    Routes,
    CDNRoutes,
    APIUser,
    APIGuildMember,
    RESTPostOAuth2AccessTokenResult,
    ImageFormat,
    DefaultUserAvatarAssets
} from 'discord-api-types/v10'

import { Cache } from './cache.js'

import Logger from '../utils/logger.js'
import config from '../config.json' assert { type: 'json' }

export class DiscordClientError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'DiscordClientError'
        Error.captureStackTrace(this, this.constructor)
    }
}

export interface UserData {
    id: string
    username: string
    avatarURL: string
    isAdmin: boolean
    isBSFR: boolean
}

export class DiscordClient {
    private static async retry<T extends (...arg0: any[]) => any>(
        fn: T,
        args: Parameters<T>,
        error: RateLimitError,
        maxTry: number,
        retryCount: number = 1
    ): Promise<Awaited<ReturnType<T>>> {
        const currRetry = typeof retryCount === 'number' ? retryCount : 1
        try {
            await new Promise((res) => setTimeout(res, error.retryAfter))
            const result = await fn(...args)
            return result
        } catch (error) {
            if (error instanceof RateLimitError) {
                if (currRetry > maxTry) {
                    throw error
                }
                return this.retry(fn, args, error, maxTry, currRetry + 1)
            } else {
                throw error
            }
        }
    }

    public static oauth2Authorization() {
        const authUrl = 'https://discord.com/api/oauth2/authorize?'
        const options = new URLSearchParams({
            response_type: 'code',
            client_id: config.discord.client_id,
            scope: 'identify guilds.members.read',
            redirect_uri: config.discord.redirect_uri,
            prompt: 'none'
        }).toString()

        return `${authUrl}${options}`
    }

    public static async oauth2TokenExchange(
        code: string,
        state: string
    ): Promise<RESTPostOAuth2AccessTokenResult> {
        try {
            const rest = new REST()
            const token = (await rest.post(Routes.oauth2TokenExchange(), {
                auth: false,
                body: new URLSearchParams({
                    client_id: config.discord.client_id,
                    client_secret: config.discord.client_secret,
                    grant_type: 'authorization_code',
                    code,
                    state,
                    redirect_uri: config.discord.redirect_uri
                }),
                passThroughBody: true,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            })) as RESTPostOAuth2AccessTokenResult
            return token
        } catch (error) {
            if (error instanceof DiscordAPIError) {
                Logger.log('Discord', 'ERROR', `${error.message}`)
            } else if (error instanceof RateLimitError) {
                Logger.log(
                    'Discord',
                    'ERROR',
                    `${error.message} (url: ${error.url}), nouvel essai dans ${error.retryAfter}ms.`
                )
                try {
                    return await this.retry(
                        this.oauth2TokenExchange,
                        [code, state],
                        error,
                        1
                    )
                } catch (error) {
                    Logger.log(
                        'Discord',
                        'ERROR',
                        `Toutes les tentatives ont échoué.`
                    )
                }
            }
            throw new DiscordClientError('Récupération du token impossible')
        }
    }

    public static async oauth2TokenRefresh(
        token: RESTPostOAuth2AccessTokenResult
    ): Promise<RESTPostOAuth2AccessTokenResult> {
        try {
            const rest = new REST()
            const refreshedToken = (await rest.post(
                Routes.oauth2TokenExchange(),
                {
                    auth: false,
                    body: new URLSearchParams({
                        client_id: config.discord.client_id,
                        client_secret: config.discord.client_secret,
                        grant_type: 'refresh_token',
                        refresh_token: token.refresh_token
                    }),
                    passThroughBody: true,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            )) as RESTPostOAuth2AccessTokenResult
            return refreshedToken
        } catch (error) {
            if (error instanceof DiscordAPIError) {
                Logger.log('Discord', 'ERROR', `${error.message}`)
            } else if (error instanceof RateLimitError) {
                Logger.log(
                    'Discord',
                    'ERROR',
                    `${error.message} (url: ${error.url}), nouvel essai dans ${error.retryAfter}ms.`
                )
                try {
                    return await this.retry(
                        this.oauth2TokenRefresh,
                        [token],
                        error,
                        1
                    )
                } catch (error) {
                    Logger.log(
                        'Discord',
                        'ERROR',
                        `Toutes les tentatives ont échoué.`
                    )
                }
            }
            throw new DiscordClientError('Actualisation du token impossible')
        }
    }

    public static async getCurrentUser(
        token: RESTPostOAuth2AccessTokenResult
    ): Promise<APIUser> {
        const cachedUser = Cache.getAuthUser(token.access_token)
        if (cachedUser) return cachedUser

        try {
            const rest = new REST().setToken(token.access_token)
            const user = (await rest.get(Routes.user('@me'), {
                authPrefix: 'Bearer',
                headers: {
                    Authorization: token.access_token
                }
            })) as APIUser
            return Cache.setAuthUser(token.access_token, user)
        } catch (error) {
            if (error instanceof DiscordAPIError) {
                Logger.log('Discord', 'ERROR', `${error.message}`)
            } else if (error instanceof RateLimitError) {
                Logger.log(
                    'Discord',
                    'ERROR',
                    `${error.message} (url: ${error.url}), nouvel essai dans ${error.retryAfter}ms.`
                )
                try {
                    return await this.retry(
                        this.getCurrentUser,
                        [token],
                        error,
                        1
                    )
                } catch (error) {
                    Logger.log(
                        'Discord',
                        'ERROR',
                        `Toutes les tentatives ont échoué.`
                    )
                }
            }
            throw new DiscordClientError(
                "Récupération de l'utilisateur impossible"
            )
        }
    }

    public static async getUser(userId: string): Promise<APIUser | null> {
        await this.getGuildMembers()

        const cachedMember = Cache.getMember(userId)
        const cachedUser = cachedMember
            ? cachedMember.user
            : Cache.getUser(userId)
        if (typeof cachedUser !== 'undefined') return cachedUser

        try {
            const rest = new REST().setToken(config.discord.bot_token)
            const user = (await rest.get(Routes.user(userId))) as APIUser
            return Cache.setUser(userId, user)
        } catch (error) {
            if (error instanceof DiscordAPIError) {
                if (error.code === 10007) {
                    // Unknown Member
                    return Cache.setUser(userId, undefined)
                } else {
                    Logger.log('Discord', 'ERROR', `${error.message}`)
                }
            } else if (error instanceof RateLimitError) {
                Logger.log(
                    'Discord',
                    'ERROR',
                    `${error.message} (url: ${error.url}), nouvel essai dans ${error.retryAfter}ms.`
                )
                try {
                    return await this.retry(this.getUser, [userId], error, 1)
                } catch (error) {
                    Logger.log(
                        'Discord',
                        'ERROR',
                        `Toutes les tentatives ont échoué.`
                    )
                }
            }
            throw new DiscordClientError(
                "Récupération de l'utilisateur impossible"
            )
        }
    }

    public static async getGuildMember(
        userId: string
    ): Promise<APIGuildMember | null> {
        await this.getGuildMembers()

        const cachedMember = Cache.getMember(userId)
        if (typeof cachedMember !== 'undefined') return cachedMember
        return null
    }

    public static async getUserData(
        token: RESTPostOAuth2AccessTokenResult
    ): Promise<UserData> {
        const user = await this.getCurrentUser(token)

        const userData: UserData = {
            id: user.id,
            username: user.global_name || user.username,
            avatarURL: this.getUserAvatar(user),
            isAdmin: false,
            isBSFR: false
        }

        const member = await this.getGuildMember(user.id)
        if (member) {
            userData.username = this.getMemberNick(member)
            userData.isBSFR = true
            // On vérifie si le membre a le rôle "Administrateur" ou "Modérateur"
            if (
                member.roles.find(
                    (r) =>
                        r === config.discord.roles['Admin'] ||
                        r === config.discord.roles['Modérateur']
                )
            )
                userData.isAdmin = true
        }

        return userData
    }

    public static getUserNick(user: APIUser) {
        return user.global_name || user.username
    }

    public static getMemberNick(member: APIGuildMember) {
        return member.nick || member.user.global_name || member.user.username
    }

    public static getUserAvatar(user: APIUser, size: number = 128) {
        const index =
            user.discriminator === '0'
                ? Number((BigInt(user.id) >> 22n) % 6n)
                : Number(user.discriminator) % 5
        const avatarURL = user.avatar
            ? CDNRoutes.userAvatar(user.id, user.avatar, ImageFormat.WebP)
            : CDNRoutes.defaultUserAvatar(index as DefaultUserAvatarAssets)
        return `https://cdn.discordapp.com${avatarURL}?size=${size}`
    }

    public static async getGuildMembers(
        after: string | null = null
    ): Promise<APIGuildMember[]> {
        const cachedMembers = Cache.getMembers()
        if (cachedMembers) return cachedMembers

        try {
            const limit = 1000
            let members: APIGuildMember[] = []
            do {
                const params: Record<string, string> = {
                    limit: limit.toString()
                }

                if (after) params.after = after

                const rest = new REST().setToken(config.discord.bot_token)
                const data = (await rest.get(
                    Routes.guildMembers(config.discord.guild_id),
                    {
                        query: new URLSearchParams(params)
                    }
                )) as APIGuildMember[]

                after =
                    data.length === limit
                        ? data.length > 0
                            ? [...data].pop()?.user.id || null
                            : null
                        : null
                members = [...members, ...data]
            } while (after !== null)
            return Cache.setMembers(members)
        } catch (error) {
            if (error instanceof DiscordAPIError) {
                Logger.log('Discord', 'ERROR', `${error.message}`)
            } else if (error instanceof RateLimitError) {
                Logger.log(
                    'Discord',
                    'ERROR',
                    `${error.message} (url: ${error.url}), nouvel essai dans ${error.retryAfter}ms.`
                )
                try {
                    return await this.retry(
                        this.getGuildMembers,
                        [after],
                        error,
                        1
                    )
                } catch (error) {
                    Logger.log(
                        'Discord',
                        'ERROR',
                        `Toutes les tentatives ont échoué.`
                    )
                }
            }
            throw new DiscordClientError(
                'Récupération des membres de la guild impossible'
            )
        }
    }
}
