const router = require('express').Router()
const Password = require('./password')
const crypter = require('../common/crypter')
const fields = ['description', 'login', 'url', 'password']
const input = body => Object.fromEntries(fields.filter(key => body?.[key] !== undefined).map(key => [key, body[key]]))
const summary = doc => ({ _id: doc._id, description: doc.description, login: doc.login, url: doc.url })
const notFound = res => res.status(404).json({ errors: ['Senha não encontrada.'] })
router.get('/myPasswords', async (req, res) => {
    const docs = await Password.find({ user: req.decoded._id }).sort('description')
    res.json(docs.map(summary))
})
router.get('/viewPassword', async (req, res) => {
    if (!req.query._id) return res.status(400).json({ errors: ['Informe o _id da senha.'] })
    const doc = await Password.findOne({ user: req.decoded._id, _id: req.query._id })
    if (!doc) return notFound(res)
    res.json({ password: crypter.decrypt(doc.password) })
})
router.post('/', async (req, res) => {
    const doc = await Password.create({ ...input(req.body), user: req.decoded._id })
    res.status(201).json(summary(doc))
})
router.put('/:id', async (req, res) => {
    const doc = await Password.findOne({ _id: req.params.id, user: req.decoded._id })
    if (!doc) return notFound(res)
    doc.set(input(req.body))
    await doc.save()
    res.json(summary(doc))
})
router.delete('/:id', async (req, res) => {
    const doc = await Password.findOneAndDelete({ _id: req.params.id, user: req.decoded._id })
    if (!doc) return notFound(res)
    res.json(summary(doc))
})
module.exports = router