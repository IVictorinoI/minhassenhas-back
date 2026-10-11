const jwt = require('jsonwebtoken')
const env = require('./env')
module.exports = (req, res, next) => {
    // CORS preflight request
    if (req.method === 'OPTIONS') {
        next()
    } else {
        const rawToken = req.body?.token || req.query.token ||
            req.headers['authorization']
        const token = typeof rawToken === 'string' ? rawToken.replace(/^Bearer\s+/i, '') : ''

        if (!token) {
            return res.status(403).send({ errors: ['No token provided.'] })
        }

        jwt.verify(token, env.authSecret, { algorithms: ['HS256'] }, function (err, decoded) {
            if (err) {
                return res.status(403).send({
                    errors: ['Failed to authenticate token.']
                })
            } else {
                req.decoded = decoded
                next()
            }
        })
    }
}
