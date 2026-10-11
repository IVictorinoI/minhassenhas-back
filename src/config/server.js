const express = require('express')
const server = express()
server.use(express.urlencoded({ extended: true }))
server.use(express.json())
server.use(require('./cors'))
server.use((req, res, next) => req.method === 'OPTIONS' ? res.sendStatus(204) : next())
require('./routes')(server)
server.use(require('../api/common/errorHandler'))
module.exports = server