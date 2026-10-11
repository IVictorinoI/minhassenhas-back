const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const User = require('./user')
const config = require('../../config/env')
const login = async (req, res) => {
    const { email = '', password = '' } = req.body || {}
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ errors: ['Credenciais inválidas.'] })
    const user = await User.findOne({ email })
    if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ errors: ['Usuário/Senha inválidos.'] })
    const token = jwt.sign({ _id: user._id.toString(), name: user.name, email: user.email }, config.authSecret, { expiresIn: '1d', algorithm: 'HS256' })
    res.json({ name: user.name, email: user.email, token })
}
const signup = async (req, res) => {
    const { name = '', email = '', password = '', confirm_password = '' } = req.body || {}
    if (![name, email, password, confirm_password].every(value => typeof value === 'string')) return res.status(400).json({ errors: ['Dados inválidos.'] })
    if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ errors: ['O e-mail informado está inválido.'] })
    if (!name.trim() || !password || Buffer.byteLength(password) > 72) return res.status(400).json({ errors: ['Informe nome e senha de até 72 bytes.'] })
    if (password !== confirm_password) return res.status(400).json({ errors: ['Senhas não conferem.'] })
    if (await User.exists({ email })) return res.status(400).json({ errors: ['Usuário já cadastrado.'] })
    await User.create({ name, email, password: await bcrypt.hash(password, 12) })
    return login(req, res)
}
const validateToken = (req, res) => {
    jwt.verify(req.body?.token || '', config.authSecret, { algorithms: ['HS256'] }, err => res.json({ valid: !err }))
}
module.exports = { login, signup, validateToken }