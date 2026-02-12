import { fileTypeFromBuffer } from 'file-type'

export class Mime {
    static async getMimeType(buffer: Buffer) {
        return await fileTypeFromBuffer(buffer)
    }
}
