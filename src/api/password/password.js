const mongoose = require('mongoose')
const crypter = require('../common/crypter')
const schema = new mongoose.Schema({
    description: { type: String, required: true },
    login: { type: String, required: true },
    url: String,
    password: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
})
schema.pre('save', function () {
    if (this.isModified('password')) this.password = crypter.encrypt(this.password)
})
module.exports = mongoose.model('Password', schema)