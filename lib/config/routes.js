var express = require('express');
var auth = require('./auth');
module.exports = function (server) {
    /*
    * Rotas abertas
    */
    var openApi = express.Router();
    server.use('/oapi', openApi);
    var AuthService = require('../api/user/authService');
    openApi.post('/login', AuthService.login);
    openApi.post('/signup', AuthService.signup);
    openApi.post('/validateToken', AuthService.validateToken);
    /*
    * Rotas protegidas por Token JWT
    */
    var protectedApi = express.Router();
    server.use('/api', protectedApi);
    protectedApi.use(auth);
    // Rotas de Passwords
    var Password = require('../api/password/passwordService');
    Password.register(protectedApi, '/passwords');
};
