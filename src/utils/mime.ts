import mmm, { Magic } from 'mmmagic'

export class Mime {
    static async getMimeType(buffer: Buffer): Promise<string | null> {
        try {
            const magic = new Magic(mmm.MAGIC_MIME_TYPE)
            return new Promise((res, rej) => {
                magic.detect(buffer, (err, result) => {
                    if (err) rej(err)
                    res(result as string)
                })
            }) as Promise<string>
        } catch (error) {
            return null
        }
    }
}
