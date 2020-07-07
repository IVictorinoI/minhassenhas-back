const crypto = require('crypto')

const myHash = 'Abacaxi'
const minhasSenhasHash = 'MinhasSenhasEncrypt-'

const encrypt = (content) => {
    var mykey = crypto.createCipher('aes-128-cbc', myHash)
    var mystr = mykey.update(minhasSenhasHash+content, 'utf8', 'hex')
    mystr += mykey.final('hex')

    return mystr
}

const decryptBase = (content) => {
    var crypto = require('crypto');

    var mykey = crypto.createDecipher('aes-128-cbc', myHash);
    var mystr = mykey.update(content, 'hex', 'utf8')
    mystr += mykey.final('utf8');
    
    return mystr
}

const decrypt = (content) => {
    try {
        return decryptBase(content).replace(minhasSenhasHash, '')
    } 
    catch (e) {
        return content;
    }
}

const isEncrypted = (content) => {
    try {
        return !!decrypt(content).indexOf(minhasSenhasHash)>=0
    } 
    catch (e) {
        return false;
    }
}


module.exports = { isEncrypted, encrypt, decrypt }