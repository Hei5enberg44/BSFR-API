import { FastifyRequest, FastifyReply, FastifyError } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'
import { BaseError as SequelizeError } from '@sequelize/core'

import { Auth } from '../controllers/auth.js'
import { DiscordClient } from '../controllers/discord.js'

import { AppError } from '../utils/error.js'
import Logger from '../utils/logger.js'
import config from '../../config.json' with { type: 'json' }

export const errorHandler = (
    error: FastifyError,
    request: FastifyRequest,
    res: FastifyReply
) => {
    // Database Error
    if (error instanceof SequelizeError)
        Logger.log('Database', 'ERROR', error.message)
    // Validation Error
    if (hasZodFastifySchemaValidationErrors(error)) {
        res.status(400).send({
            statusCode: 400,
            code: 'ERR_VALIDATION',
            error: 'Bad Request',
            message: error.message
        })
    } else if (error instanceof AppError) {
        Logger.log('Application', 'ERROR', error.message)
        res.status(error.statusCode).send({
            statusCode: error.statusCode,
            code: error.code,
            error: error.error,
            message: error.message
        })
    } else {
        Logger.log('Application', 'ERROR', error.message)
        res.status(500).send({
            statusCode: 500,
            code: 'ERR_SERVER',
            error: 'Internal Server Error'
        })
    }
}

export const apiAuth = async (req: FastifyRequest, res: FastifyReply) => {
    if (
        typeof req.headers['x-api-key'] === 'undefined' ||
        req.headers['x-api-key'] !== config.app.api.token
    )
        throw new AppError(
            401,
            'ERR_UNAUTHORIZED',
            'Unauthorized',
            'Invalid API key'
        )
}

export const authCheck = async (req: FastifyRequest, res: FastifyReply) => {
    const app = req.fastify

    const userId = await Auth.check(req.session.get('token'))
    const userData = await DiscordClient.getUserData(app.discord.guild, userId)
    req.userData = userData
}

export const requireNitro = async (req: FastifyRequest, res: FastifyReply) => {
    await authCheck(req, res)
    const userData = req.userData
    if (!(userData.isNitroBooster || userData.isAdmin))
        throw new AppError(
            403,
            'ERR_FORBIDDEN',
            'Forbidden',
            'Vous devez booster le serveur Discord afin de pouvoir accéder à cette ressource'
        )
}

export const requireAdmin = async (req: FastifyRequest, res: FastifyReply) => {
    await authCheck(req, res)
    const userData = req.userData
    if (!userData.isAdmin)
        throw new AppError(
            403,
            'ERR_FORBIDDEN',
            'Forbidden',
            'Vous devez disposer du rôle Admin afin de pouvoir accéder à cette ressource'
        )
}
