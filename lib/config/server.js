var port = process.env.PORT || 3000;
var bodyParser = require('body-parser');
var express = require('express');
var server = express();
var allowCors = require('./cors');
var queryParser = require('express-query-int');
var crypter = require('../api/common/crypter');
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(allowCors);
server.use(queryParser());
var httpServer = server.listen(port, function () {
    console.log("BACKEND is running on port " + port + ".");
});
require('./socketio')(httpServer);
module.exports = server;
