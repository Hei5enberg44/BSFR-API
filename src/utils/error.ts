type ErrorCode =
    | 'ERR_SERVER'
    | 'ERR_VALIDATION'
    | 'ERR_BEATSABER'
    | 'ERR_UNAUTHORIZED'
    | 'ERR_DISCORD'
    | 'ERR_FORBIDDEN'

export class AppError extends Error {
    statusCode
    code
    error
    constructor(
        statusCode: number,
        code: ErrorCode,
        error: string,
        message: string
    ) {
        super(message)
        this.statusCode = statusCode
        this.code = code
        this.error = error
        Error.captureStackTrace(this, this.constructor)
    }
}
