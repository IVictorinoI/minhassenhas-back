const { test } = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
process.env.AUTH_SECRET = 'http-contract-test-secret-'.repeat(3)
process.env.ENCRYPTION_KEY = 'ab'.repeat(32)
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const Password = require('../src/api/password/password')
const crypter = require('../src/api/common/crypter')
const app = require('../src/config/server')
const owner = '507f1f77bcf86cd799439011'
const other = '507f1f77bcf86cd799439012'
const id = '507f1f77bcf86cd799439013'
const token = jwt.sign({ _id: owner }, process.env.AUTH_SECRET, { expiresIn: '1h' })
const record = () => ({ _id: id, user: owner, description: 'Conta', login: 'maria', url: 'https://example.com', password: crypter.encrypt('segredo🔐') })
const publicRecord = doc => ({ _id: doc._id, description: doc.description, login: doc.login, url: doc.url })
async function client(t) {
    const server = app.listen(0, '127.0.0.1')
    t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
    await once(server, 'listening')
    return async (path, { method = 'GET', body, authorized = true, raw } = {}) => {
        const res = await fetch('http://127.0.0.1:' + server.address().port + path, {
            method, headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: 'Bearer ' + token } : {}) },
            ...(raw !== undefined ? { body: raw } : body !== undefined ? { body: JSON.stringify(body) } : {})
        })
        const text = await res.text()
        return { status: res.status, body: text ? JSON.parse(text) : undefined, headers: res.headers }
    }
}
function forbiddenDatabase(t) {
    for (const method of ['find', 'findOne', 'create', 'findOneAndDelete']) t.mock.method(Password, method, () => assert.fail('Não deve consultar persistência'))
}
test('listagem filtra proprietário, ordena descrição e não expõe senha ou usuário', async t => {
    const doc = record()
    t.mock.method(Password, 'find', filter => {
        assert.deepEqual(filter, { user: owner })
        return { sort: async field => { assert.equal(field, 'description'); return [doc] } }
    })
    const request = await client(t)
    const res = await request('/api/passwords/myPasswords')
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, [publicRecord(doc)])
})
test('listagem vazia retorna array vazio', async t => {
    t.mock.method(Password, 'find', () => ({ sort: async () => [] }))
    const request = await client(t)
    assert.deepEqual((await request('/api/passwords/myPasswords')).body, [])
})
test('visualização revela somente senha descriptografada do proprietário', async t => {
    t.mock.method(Password, 'findOne', async filter => { assert.deepEqual(filter, { user: owner, _id: id }); return record() })
    const request = await client(t)
    const res = await request('/api/passwords/viewPassword?_id=' + id)
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, { password: 'segredo🔐' })
})
test('visualização sem identificador falha antes de acessar banco', async t => {
    forbiddenDatabase(t)
    const request = await client(t)
    const res = await request('/api/passwords/viewPassword')
    assert.equal(res.status, 400)
    assert.deepEqual(res.body, { errors: ['Informe o _id da senha.'] })
})
for (const [method, path] of [['GET', '/viewPassword?_id=' + id], ['PUT', '/' + id], ['DELETE', '/' + id]]) {
    test(method + ' não permite acessar credencial de outro usuário', async t => {
        const foreign = { ...record(), user: other }
        const lookup = t.mock.method(Password, method === 'DELETE' ? 'findOneAndDelete' : 'findOne', async filter => {
            assert.equal(filter._id, id)
            assert.equal(filter.user, owner)
            return filter.user === foreign.user ? foreign : null
        })
        const request = await client(t)
        const res = await request('/api/passwords' + path, { method, ...(method === 'PUT' ? { body: { password: 'invasor' } } : {}) })
        assert.equal(res.status, 404)
        assert.deepEqual(res.body, { errors: ['Senha não encontrada.'] })
        assert.equal(lookup.mock.callCount(), 1)
    })
    test(method + ' retorna 404 para credencial inexistente', async t => {
        t.mock.method(Password, method === 'DELETE' ? 'findOneAndDelete' : 'findOne', async () => null)
        const request = await client(t)
        const res = await request('/api/passwords' + path, { method })
        assert.equal(res.status, 404)
        assert.deepEqual(res.body, { errors: ['Senha não encontrada.'] })
    })
}
test('criação ignora campos extras e usa proprietário autenticado', async t => {
    const doc = record()
    t.mock.method(Password, 'create', async data => {
        assert.deepEqual(data, { description: doc.description, login: doc.login, url: doc.url, password: 'nova', user: owner })
        return doc
    })
    const request = await client(t)
    const res = await request('/api/passwords/', { method: 'POST', body: { ...doc, password: 'nova', user: other, _id: other, admin: true } })
    assert.equal(res.status, 201)
    assert.deepEqual(res.body, publicRecord(doc))
})
for (const patch of [{ description: 'Alterada' }, { login: 'novo' }, { url: '' }, { password: 'nova senha' }, {}]) {
    test('atualização parcial preserva campos omitidos: ' + JSON.stringify(patch), async t => {
        const doc = new Password(record())
        const before = doc.toObject()
        t.mock.method(Password, 'findOne', async filter => { assert.deepEqual(filter, { _id: id, user: owner }); return doc })
        const save = t.mock.method(doc, 'save', async () => { await doc.validate(); return doc })
        const request = await client(t)
        const res = await request('/api/passwords/' + id, { method: 'PUT', body: { ...patch, user: other, _id: other, admin: true } })
        assert.equal(res.status, 200)
        assert.equal(save.mock.callCount(), 1)
        for (const key of ['description', 'login', 'url', 'password']) assert.equal(doc[key], patch[key] === undefined ? before[key] : patch[key])
        assert.equal(doc.user.toString(), owner)
        assert.equal(doc._id.toString(), id)
        assert.deepEqual(res.body, { ...publicRecord(doc), _id: id })
    })
}
test('exclusão usa proprietário e retorna somente resumo público', async t => {
    const doc = record()
    t.mock.method(Password, 'findOneAndDelete', async filter => { assert.deepEqual(filter, { _id: id, user: owner }); return doc })
    const request = await client(t)
    const res = await request('/api/passwords/' + id, { method: 'DELETE' })
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, publicRecord(doc))
})
for (const [method, path] of [['GET', '/myPasswords'], ['GET', '/viewPassword?_id=' + id], ['POST', '/'], ['PUT', '/' + id], ['DELETE', '/' + id]]) {
    test(method + ' ' + path + ' exige autenticação antes de consultar banco', async t => {
        forbiddenDatabase(t)
        const request = await client(t)
        const res = await request('/api/passwords' + path, { method, authorized: false })
        assert.equal(res.status, 403)
        assert.deepEqual(res.body, { errors: ['No token provided.'] })
    })
    test(method + ' ' + path + ' trata falha de persistência sem revelar detalhes', async t => {
        const error = new Error('mongodb://credenciais-privadas')
        t.mock.method(console, 'error', () => {})
        t.mock.method(Password, 'find', () => ({ sort: async () => { throw error } }))
        for (const operation of ['findOne', 'create', 'findOneAndDelete']) t.mock.method(Password, operation, async () => { throw error })
        const request = await client(t)
        const res = await request('/api/passwords' + path, { method })
        assert.equal(res.status, 500)
        assert.deepEqual(res.body, { errors: ['Erro interno do servidor.'] })
    })
}
test('falha ao salvar atualização chega ao tratamento central', async t => {
    t.mock.method(console, 'error', () => {})
    const doc = new Password(record())
    t.mock.method(doc, 'save', async () => { throw new Error('falha ao salvar') })
    t.mock.method(Password, 'findOne', async () => doc)
    const request = await client(t)
    const res = await request('/api/passwords/' + id, { method: 'PUT', body: { login: 'novo' } })
    assert.equal(res.status, 500)
    assert.deepEqual(res.body, { errors: ['Erro interno do servidor.'] })
})
for (const method of ['GET', 'PUT', 'DELETE']) test(method + ' converte identificador inválido em 400', async t => {
    const error = new mongoose.Error.CastError('ObjectId', 'invalido', '_id')
    t.mock.method(Password, method === 'DELETE' ? 'findOneAndDelete' : 'findOne', async () => { throw error })
    const request = await client(t)
    const path = method === 'GET' ? '/viewPassword?_id=invalido' : '/invalido'
    const res = await request('/api/passwords' + path, { method })
    assert.equal(res.status, 400)
    assert.deepEqual(res.body, { errors: ['Identificador inválido.'] })
})
for (const method of ['POST', 'PUT']) test(method + ' retorna erros de validação do modelo', async t => {
    const doc = new Password({ user: owner })
    const error = await doc.validate().then(() => assert.fail('Deveria rejeitar documento inválido'), error => error)
    if (method === 'POST') t.mock.method(Password, 'create', async () => { throw error })
    else {
        t.mock.method(Password, 'findOne', async () => doc)
        t.mock.method(doc, 'save', async () => { throw error })
    }
    const request = await client(t)
    const res = await request('/api/passwords/' + (method === 'PUT' ? id : ''), { method, body: {} })
    assert.equal(res.status, 400)
    assert.deepEqual(res.body.errors.sort(), Object.values(error.errors).map(e => e.message).sort())
})
test('JSON malformado retorna 400 no formato da API', async t => {
    forbiddenDatabase(t)
    const request = await client(t)
    const res = await request('/api/passwords/', { method: 'POST', raw: '{"password":' })
    assert.equal(res.status, 400)
    assert.deepEqual(res.body, { errors: ['Corpo da requisição inválido.'] })
})
test('preflight retorna 204 e permite cabeçalho de autenticação', async t => {
    forbiddenDatabase(t)
    const request = await client(t)
    const res = await request('/api/passwords/', { method: 'OPTIONS', authorized: false })
    assert.equal(res.status, 204)
    assert.equal(res.headers.get('access-control-allow-origin'), '*')
    assert.match(res.headers.get('access-control-allow-headers'), /Authorization/)
    assert.match(res.headers.get('access-control-allow-methods'), /PUT/)
})


test('rotas públicas cadastram e autenticam com hash real sem expor dados privados', async t => {
    const User = require('../src/api/user/user')
    const bcrypt = require('bcrypt')
    let stored
    t.mock.method(User, 'exists', async () => stored ? { _id: owner } : null)
    t.mock.method(User, 'create', async data => { stored = { ...data, _id: owner }; return stored })
    t.mock.method(User, 'findOne', async ({ email }) => stored?.email === email ? stored : null)
    const request = await client(t)
    const signup = { name: 'Maria', email: 'maria@example.com', password: 'Senha123!', confirm_password: 'Senha123!' }
    const created = await request('/oapi/signup', { method: 'POST', authorized: false, body: signup })
    assert.equal(created.status, 200)
    assert.equal(await bcrypt.compare(signup.password, stored.password), true)
    assert.deepEqual(Object.keys(created.body).sort(), ['email', 'name', 'token'])
    assert.equal(created.body.name, signup.name)
    assert.equal(created.body.email, signup.email)
    const payload = jwt.verify(created.body.token, process.env.AUTH_SECRET, { algorithms: ['HS256'] })
    assert.equal(payload._id, owner)
    assert.equal(payload.exp - payload.iat, 86400)
    assert.equal(payload.password, undefined)
    const duplicate = await request('/oapi/signup', { method: 'POST', authorized: false, body: signup })
    assert.equal(duplicate.status, 400)
    assert.deepEqual(duplicate.body, { errors: ['Usuário já cadastrado.'] })
    const login = await request('/oapi/login', { method: 'POST', authorized: false, body: signup })
    assert.equal(login.status, 200)
    assert.equal(jwt.verify(login.body.token, process.env.AUTH_SECRET)._id, owner)
    const invalid = await request('/oapi/login', { method: 'POST', authorized: false, body: { ...signup, password: 'errada' } })
    assert.equal(invalid.status, 400)
    assert.deepEqual(invalid.body, { errors: ['Usuário/Senha inválidos.'] })
    for (const [token, valid] of [[login.body.token, true], ['invalido', false]]) {
        const validation = await request('/oapi/validateToken', { method: 'POST', authorized: false, body: { token } })
        assert.equal(validation.status, 200)
        assert.deepEqual(validation.body, { valid })
    }
})
for (const path of ['/oapi/login', '/oapi/signup']) test(path + ' converte falha de banco em erro público 500', async t => {
    const User = require('../src/api/user/user')
    t.mock.method(console, 'error', () => {})
    for (const method of ['findOne', 'exists']) t.mock.method(User, method, async () => { throw new Error('falha de conexão') })
    const request = await client(t)
    const res = await request(path, { method: 'POST', authorized: false, body: { name: 'Maria', email: 'maria@example.com', password: 'senha', confirm_password: 'senha' } })
    assert.equal(res.status, 500)
    assert.deepEqual(res.body, { errors: ['Erro interno do servidor.'] })
})
test('visualização de ciphertext adulterado falha sem expor conteúdo', async t => {
    t.mock.method(console, 'error', () => {})
    const doc = record()
    const parts = doc.password.split(':')
    parts[2] = (parts[2].startsWith('00') ? '01' : '00') + parts[2].slice(2)
    doc.password = parts.join(':')
    t.mock.method(Password, 'findOne', async () => doc)
    const request = await client(t)
    const res = await request('/api/passwords/viewPassword?_id=' + id)
    assert.equal(res.status, 500)
    assert.deepEqual(res.body, { errors: ['Erro interno do servidor.'] })
})
