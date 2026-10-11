const { test } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
process.env.AUTH_SECRET = crypto.randomBytes(32).toString('hex')
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex')
const mongoose = require('mongoose')
const app = require('../src/config/server')
const Password = require('../src/api/password/password')

test('cadastro, JWT, CRUD e isolamento entre usuários', { skip: !process.env.TEST_MONGODB_URI }, async t => {
    // Banco exclusivo por execução: nunca limpa o banco da aplicação.
    await mongoose.connect(process.env.TEST_MONGODB_URI, { dbName: 'minhassenhas_test_' + crypto.randomBytes(8).toString('hex') })
    const server = app.listen(0, '127.0.0.1')
    await new Promise(resolve => server.once('listening', resolve))
    t.after(async () => {
        await new Promise(resolve => server.close(resolve))
        await mongoose.connection.dropDatabase()
        await mongoose.disconnect()
    })
    const base = 'http://127.0.0.1:' + server.address().port
    const request = async (path, method = 'GET', body, token) => {
        const response = await fetch(base + path, {
            method,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {})
        })
        return { status: response.status, body: await response.json() }
    }
    const signup = async email => {
        const result = await request('/oapi/signup', 'POST', { name: 'Teste', email, password: 'Senha123!', confirm_password: 'Senha123!' })
        assert.equal(result.status, 200)
        return result.body.token
    }
    const first = await signup('primeiro@example.com')
    const second = await signup('segundo@example.com')
    const payload = require('jsonwebtoken').decode(first)
    assert.equal(payload.password, undefined)
    assert.equal((await request('/oapi/validateToken', 'POST', { token: first })).body.valid, true)
    assert.equal((await request('/oapi/validateToken', 'POST', { token: 'inválido' })).body.valid, false)
    assert.equal((await request('/oapi/login', 'POST', { email: 'primeiro@example.com', password: 'Senha123!' })).status, 200)
    assert.equal((await request('/oapi/login', 'POST', { email: 'primeiro@example.com', password: 'errada' })).status, 400)
    assert.equal((await request('/api/passwords/myPasswords')).status, 403)
    const created = await request('/api/passwords/', 'POST', { _id: '', description: 'Exemplo', login: 'teste', password: 'segredo', user: payload._id }, first)
    assert.equal(created.status, 201)
    assert.equal(created.body.password, undefined)
    const id = created.body._id
    assert.match(id, /^[a-f\d]{24}$/i)
    const stored = await Password.findById(id)
    assert.match(stored.password, /^v2:/)
    assert.equal((await request('/api/passwords/myPasswords', 'GET', undefined, first)).body.length, 1)
    assert.equal((await request('/api/passwords/myPasswords', 'GET', undefined, second)).body.length, 0)
    const view = '/api/passwords/viewPassword?_id=' + id
    assert.equal((await request(view, 'GET', undefined, first)).body.password, 'segredo')
    assert.equal((await request(view, 'GET', undefined, second)).status, 404)
    assert.equal((await request('/api/passwords/' + id, 'PUT', { password: 'invasor' }, second)).status, 404)
    assert.equal((await request('/api/passwords/' + id, 'DELETE', undefined, second)).status, 404)
    assert.equal((await request('/api/passwords/' + id, 'PUT', { password: 'novo' }, first)).status, 200)
    assert.equal((await request(view, 'GET', undefined, first)).body.password, 'novo')
    assert.equal((await request('/api/passwords/' + id, 'PUT', { description: 'Alterada' }, first)).status, 200)
    assert.equal((await request(view, 'GET', undefined, first)).body.password, 'novo')
    assert.equal((await request('/api/passwords/viewPassword?_id=invalido', 'GET', undefined, first)).status, 400)
    assert.equal((await request('/api/passwords/' + id, 'DELETE', undefined, first)).status, 200)
    assert.equal((await request(view, 'GET', undefined, first)).status, 404)
})
