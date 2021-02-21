var restful = require('node-restful');
var crypter = require('../common/crypter');
var mongoose = restful.mongoose;
var passwordSchema = new mongoose.Schema({
    description: { type: String, required: true },
    login: { type: String, required: true },
    url: { type: String },
    password: { type: String, required: true },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});
passwordSchema.pre('save', function (next) {
    if (this.password && !crypter.isEncrypted(this.password))
        this.password = crypter.encrypt(this.password);
    next();
});
module.exports = restful.model('Password', passwordSchema);
