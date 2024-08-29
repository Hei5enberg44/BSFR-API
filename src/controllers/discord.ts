import { Guild, OverwriteData, TextChannel } from 'discord.js'
import { REST, DiscordAPIError, RateLimitError } from '@discordjs/rest'
import {
    APIUser,
    RESTPostOAuth2AccessTokenResult,
    Routes
} from 'discord-api-types/v10'

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
    displayName: string
    avatarURL: string
    isAdmin: boolean
    isBSFR: boolean
    isNitroBooster: boolean
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
            scope: 'identify',
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

    public static async getCurrentUser(
        token: RESTPostOAuth2AccessTokenResult
    ): Promise<APIUser> {
        try {
            const rest = new REST().setToken(token.access_token)
            const user = (await rest.get(Routes.user('@me'), {
                authPrefix: 'Bearer',
                headers: {
                    Authorization: token.access_token
                }
            })) as APIUser
            return user
        } catch (error) {
            if (error instanceof DiscordAPIError) {
                Logger.log('Discord', 'ERROR', `${error.message}`)
                if (error.status === 401) {
                    throw new DiscordClientError(error.message)
                }
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

    public static async getUserData(
        guild: Guild,
        userId: string
    ): Promise<UserData> {
        const user =
            guild.client.users.cache.get(userId) ??
            (await guild.client.users.fetch(userId))

        const userData: UserData = {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarURL: user.displayAvatarURL({ extension: 'webp', size: 128 }),
            isAdmin: false,
            isBSFR: false,
            isNitroBooster: false
        }

        const member = guild.members.cache.get(userId)
        if (member) {
            userData.displayName = member.displayName
            userData.avatarURL = member.displayAvatarURL({
                extension: 'webp',
                size: 128
            })
            userData.isBSFR = true
            // On vérifie si le membre a le rôle "Administrateur" ou "Modérateur"
            if (
                member.roles.cache.find(
                    (r) =>
                        r.id === config.discord.roles['Admin'] ||
                        r.id === config.discord.roles['Modérateur']
                )
            )
                userData.isAdmin = true
            // On vérifie si le membre boost le serveur
            if (member.premiumSince) userData.isNitroBooster = true
        }

        return userData
    }

    public static async updateChannelPermissions(
        guild: Guild,
        channelId: string,
        permissions: OverwriteData[]
    ) {
        const channel = guild.channels.cache.get(channelId)
        if (channel) {
            await (channel as TextChannel).permissionOverwrites.set(permissions)
        }
    }
}
