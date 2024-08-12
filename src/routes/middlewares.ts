import { FastifyRequest, FastifyReply, DoneFuncWithErrOrRes } from 'fastify'
import { Auth, AuthError, AuthNoSessionError } from '../controllers/auth.js'

export const authCheck = async (req: FastifyRequest, res: FastifyReply) => {
    try {
        const sessionId = req.cookies.sessionId
        if (typeof sessionId === 'undefined')
            throw new AuthNoSessionError('Cookie de session invalide')

        const token = await Auth.check(req.unsignCookie(sessionId))
        req.token = token
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
