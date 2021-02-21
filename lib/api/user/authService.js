var _ = require('lodash');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var User = require('./user');
var env = require('../../.env');
var emailRegex = /\S+@\S+\.\S+/;
var passwordRegex = /((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%]).{6,20})/;
var sendErrorsFromDB = function (res, dbErrors) {
    var errors = [];
    _.forIn(dbErrors.errors, function (error) { return errors.push(error.message); });
    return res.status(400).json({ errors: errors });
};
var login = function (req, res, next) {
    var email = req.body.email || '';
    var password = req.body.password || '';
    User.findOne({ email: email }, function (err, user) {
        if (err) {
            return sendErrorsFromDB(res, err);
        }
        else if (user && bcrypt.compareSync(password, user.password)) {
            var userToken = {
                _id: user._id,
                name: user.name,
                email: user.email,
                password: user.password
            };
            var token = jwt.sign(userToken, env.authSecret, {
                expiresIn: "1 day"
            });
            var name = user.name, email_1 = user.email;
            res.json({ name: name, email: email_1, token: token });
        }
        else {
            return res.status(400).send({ errors: ['Usuário/Senha inválidos'] });
        }
    });
};
var validateToken = function (req, res, next) {
    var token = req.body.token || '';
    jwt.verify(token, env.authSecret, function (err, decoded) {
        return res.status(200).send({ valid: !err });
    });
};
var signup = function (req, res, next) {
    var name = req.body.name || '';
    var email = req.body.email || '';
    var password = req.body.password || '';
    var confirmPassword = req.body.confirm_password || '';
    if (!email.match(emailRegex)) {
        return res.status(400).send({ errors: ['O e-mail informado está inválido'] });
    }
    /*if (!password.match(passwordRegex)) {
        return res.status(400).send({
            errors: [
                "Senha precisar ter: uma letra maiúscula, uma letra minúscula, um número, uma caractere especial(@#$ %) e tamanho entre 6-20."
            ]
        })
    }*/
    var salt = bcrypt.genSaltSync();
    var passwordHash = bcrypt.hashSync(password, salt);
    if (!bcrypt.compareSync(confirmPassword, passwordHash)) {
        return res.status(400).send({ errors: ['Senhas não conferem.'] });
    }
    User.findOne({ email: email }, function (err, user) {
        if (err) {
            return sendErrorsFromDB(res, err);
        }
        else if (user) {
            return res.status(400).send({ errors: ['Usuário já cadastrado.'] });
        }
        else {
            var newUser = new User({ name: name, email: email, password: passwordHash });
            newUser.save(function (err) {
                if (err) {
                    return sendErrorsFromDB(res, err);
                }
                else {
                    login(req, res, next);
                }
            });
        }
    });
};
module.exports = { login: login, signup: signup, validateToken: validateToken };
