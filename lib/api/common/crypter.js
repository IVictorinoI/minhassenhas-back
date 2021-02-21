var crypto = require('crypto');
var myHash = 'Abacaxi';
var minhasSenhasHash = 'MinhasSenhasEncrypt-';
var encrypt = function (content) {
    var mykey = crypto.createCipher('aes-128-cbc', myHash);
    var mystr = mykey.update(minhasSenhasHash + content, 'utf8', 'hex');
    mystr += mykey.final('hex');
    return mystr;
};
var decryptBase = function (content) {
    var crypto = require('crypto');
    var mykey = crypto.createDecipher('aes-128-cbc', myHash);
    var mystr = mykey.update(content, 'hex', 'utf8');
    mystr += mykey.final('utf8');
    return mystr;
};
var decrypt = function (content) {
    try {
        return decryptBase(content).replace(minhasSenhasHash, '');
    }
    catch (e) {
        return content;
    }
};
var isEncrypted = function (content) {
    try {
        return !!decrypt(content).indexOf(minhasSenhasHash) >= 0;
    }
    catch (e) {
        return false;
    }
};
module.exports = { isEncrypted: isEncrypted, encrypt: encrypt, decrypt: decrypt };
