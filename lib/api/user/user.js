var restful = require('node-restful');
var mongoose = restful.mongoose;
var userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, min: 6, max: 12, required: true }
});
module.exports = restful.model('User', userSchema);
