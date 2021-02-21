var _ = require('lodash');
module.exports = function (req, res, next) {
    var bundle = res.locals.bundle;
    if (bundle.errors) {
        var errors = parseErrors(bundle.errors);
        res.status(500).json({ errors: errors });
    }
    else {
        next();
    }
};
var parseErrors = function (nodeRestfulErrors) {
    var errors = [];
    _.forIn(nodeRestfulErrors, function (error) { return errors.push(error.message); });
    return errors;
};
