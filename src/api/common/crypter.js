const crypto = require('node:crypto')
const prefix = 'MinhasSenhasEncrypt-'
const encryptionKey = () => {
    const key = process.env.ENCRYPTION_KEY
    if (!key || !/^[a-f\d]{64}$/i.test(key)) throw new Error('ENCRYPTION_KEY deve conter 64 caracteres hexadecimais.')
    return Buffer.from(key, 'hex')
}
const encrypt = content => {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
    const data = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()])
    return ['v2', iv.toString('hex'), cipher.getAuthTag().toString('hex'), data.toString('hex')].join(':')
}
const decrypt = content => {
    if (content.startsWith('v2:')) {
        const [, iv, tag, data] = content.split(':')
        const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'hex'))
        decipher.setAuthTag(Buffer.from(tag, 'hex'))
        return Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8')
    }
    // Compatibilidade com EVP_BytesToKey do createDecipher removido do Node.
    try {
        const password = Buffer.from('Abacaxi')
        const key = crypto.createHash('md5').update(password).digest()
        const iv = crypto.createHash('md5').update(Buffer.concat([key, password])).digest()
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv)
        const plain = Buffer.concat([decipher.update(Buffer.from(content, 'hex')), decipher.final()]).toString('utf8')
        if (!plain.startsWith(prefix)) return content
        return plain.slice(prefix.length)
    } catch { return content }
}
module.exports = { encrypt, decrypt, encryptionKey }