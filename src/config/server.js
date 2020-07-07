const port = process.env.PORT || 3000

const bodyParser = require('body-parser')
const express = require('express')
const server = express()
const allowCors = require('./cors')
const queryParser = require('express-query-int')
const crypter = require('../api/common/crypter')

server.use(bodyParser.urlencoded({ extended: true }))
server.use(bodyParser.json())
server.use(allowCors)
server.use(queryParser())

const httpServer = server.listen(port, function() {
    console.log(`BACKEND is running on port ${port}.`)
})

require('./socketio')(httpServer)

module.exports = server