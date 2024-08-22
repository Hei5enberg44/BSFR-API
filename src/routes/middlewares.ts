import { FastifyRequest, FastifyReply, FastifyError } from 'fastify'
import { Error as SequelizeError } from 'sequelize'
import { ZodError } from 'zod'
import { Auth, AuthError, AuthNoSessionError } from '../controllers/auth.js'
import { DiscordClient } from '../controllers/discord.js'
import Logger from '../utils/logger.js'

export const errorHandler = (
    error: FastifyError,
    request: FastifyRequest,
    res: FastifyReply
) => {
    if (error instanceof ZodError) {
        res.status(400).send({
            message: 'Paramètres invalides',
            errors: JSON.parse(error.message)
        })
    } else if (error instanceof SequelizeError) {
        Logger.log('Database', 'ERROR', error.message)
        res.status(500).send({
            message: "Échec de l'exécution de la requête SQL"
        })
    } else {
        throw error
    }
}

export const authCheck = async (req: FastifyRequest, res: FastifyReply) => {
    const app = req.fastify

    try {
        const sessionId = req.cookies.sessionId
        if (typeof sessionId === 'undefined')
            throw new AuthNoSessionError('Cookie de session invalide')

        const userId = await Auth.check(req.unsignCookie(sessionId))
        const userData = await DiscordClient.getUserData(
            app.discord.guild,
            userId
        )
        req.userData = userData
    } catch (error) {
        if (error instanceof AuthNoSessionError) {
            res.status(403).send({ message: error.message })
        } else if (error instanceof AuthError) {
            res.status(401).send({ message: error.message })
        } else {
            throw error
        }
    }
}

export const requireNitro = async (req: FastifyRequest, res: FastifyReply) => {
    const userData = req.userData
    if (!(userData.isNitroBooster || userData.isAdmin))
        res.status(403).send({
            message:
                'Vous devez booster le serveur Discord afin de pouvoir utiliser cette fonctionnalité'
        })
}

export const requireAdmin = async (req: FastifyRequest, res: FastifyReply) => {
    const userData = req.userData
    if (!userData.isAdmin)
        res.status(403).send({
            message: 'Accès réservé aux modérateurs/administrateurs'
        })
}
