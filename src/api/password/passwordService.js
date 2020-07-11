const Password = require('./password')
const errorHandler = require('../common/errorHandler.js')
const crypter = require('../common/crypter.js')

Password.methods(['put', 'post', 'delete'])
Password.updateOptions({new: true, runValidators: true})
Password.after('post', errorHandler).after('put', errorHandler)

Password.before('post', async (req, res, next) => {
    const token = req.decoded

    req.body.user = token._id;

    next()
})

Password.route('myPasswords', ['get'], function(req, res, next) { 
    const token = req.decoded
    
    Password.find({ user: token._id }).sort('description').exec(function(err, docs) {
        res.json(docs.map((doc) => {
            return {
                description: doc.description,
                login: doc.login,
                url: doc.url,
                _id: doc._id
            }
        }))
    })    
})

Password.route('viewPassword', ['get'], function(req, res, next) { 
    const token = req.decoded

    console.log(req.query._id)
    
    Password.findOne({ user: token._id, _id: req.query._id }, function(err, doc) {
        res.json({
            password: crypter.decrypt(doc.password)
        })
    })    
})



module.exports = Password

