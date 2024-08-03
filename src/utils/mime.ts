import mmm, { Magic } from 'mmmagic'

export class Mime {
    static getMimeType(buffer: Buffer) {
        try {
            const magic = new Magic(mmm.MAGIC_MIME_TYPE)
            return new Promise((res, rej) => {
                magic.detect(buffer, (err, result) => {
                    if (err) rej(err)
                    res(result)
                })
            })
        } catch (error) {
            return null
        }
    }
}
