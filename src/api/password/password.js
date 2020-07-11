const restful = require('node-restful')
const crypter = require('../common/crypter')
const mongoose = restful.mongoose

const passwordSchema = new mongoose.Schema({
    description: { type: String, required: true },
    login: { type: String, required: true },
    password: { type: String, required: true },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
})



passwordSchema.pre('save', function (next) {    
    if(this.password && !crypter.isEncrypted(this.password))
        this.password = crypter.encrypt(this.password)

    next();
})

module.exports = restful.model('Password', passwordSchema)