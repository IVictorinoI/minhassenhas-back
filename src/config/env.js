const authSecret = process.env.AUTH_SECRET
if (!authSecret || authSecret.length < 32) throw new Error('Defina AUTH_SECRET com pelo menos 32 caracteres.')
module.exports = { authSecret }