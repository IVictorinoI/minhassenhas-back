const { test } = require('node:test')
const assert = require('node:assert/strict')
process.env.ENCRYPTION_KEY = 'ab'.repeat(32)
const Password = require('../src/api/password/password')
const User = require('../src/api/user/user')
const { decrypt } = require('../src/api/common/crypter')
const validPassword = { description: 'Conta', login: 'maria', password: 'senha🔐', user: '507f1f77bcf86cd799439011' }
const validUser = { name: 'Maria', email: 'maria@example.com', password: 'hash' }
for (const [Model, values, fields] of [[Password, validPassword, ['description', 'login', 'password', 'user']], [User, validUser, ['name', 'email', 'password']]]) {
    for (const field of fields) {
        for (const value of [undefined, null, '']) test(Model.modelName + ' exige ' + field + ': ' + String(value), async () => {
            const doc = new Model({ ...values, [field]: value })
            await assert.rejects(doc.validate(), error => {
                assert.equal(error.name, 'ValidationError')
                assert.ok(error.errors[field])
                return true
            })
        })
    }
    test(Model.modelName + ' aceita dados válidos sem acessar banco', async () => {
        await new Model(values).validate()
    })
}
test('credencial aceita URL omitida e rejeita proprietário inválido', async () => {
    await new Password(validPassword).validate()
    await assert.rejects(new Password({ ...validPassword, user: 'invalido' }).validate(), error => {
        assert.equal(error.errors.user.name, 'CastError')
        return true
    })
})
test('gravação criptografa senha e atualizações de metadados preservam ciphertext', async t => {
    let inserted, update
    t.mock.method(Password.collection, 'insertOne', async data => { inserted = { ...data }; return { acknowledged: true, insertedId: data._id } })
    t.mock.method(Password.collection, 'updateOne', async (filter, data) => { update = data; return { acknowledged: true, matchedCount: 1, modifiedCount: 1 } })
    const doc = new Password(validPassword)
    await doc.save()
    assert.notEqual(inserted.password, validPassword.password)
    assert.equal(decrypt(inserted.password), validPassword.password)
    const ciphertext = doc.password
    doc.description = 'Alterada'
    await doc.save()
    assert.equal(doc.password, ciphertext)
    assert.equal(update.$set.password, undefined)
    doc.password = 'nova senha'
    await doc.save()
    assert.notEqual(doc.password, ciphertext)
    assert.equal(decrypt(update.$set.password), 'nova senha')
})
for (const password of ['texto antigo', 'b96c38ef1192908418f41fbf7556888126bfaafba9f3bcaec3a47c8eb2d09667f5e0de2651e13947d4e2063c0a139427']) {
    test('alterar metadados preserva senha legada: ' + password.slice(0, 12), async t => {
        let update
        t.mock.method(Password.collection, 'updateOne', async (filter, data) => { update = data; return { acknowledged: true, matchedCount: 1, modifiedCount: 1 } })
        const doc = Password.hydrate({ ...validPassword, _id: '507f1f77bcf86cd799439013', password })
        doc.description = 'Alterada'
        await doc.save()
        assert.equal(doc.password, password)
        assert.equal(update.$set.password, undefined)
    })
}
test('falha de criptografia impede escrita de senha em claro', async t => {
    const previous = process.env.ENCRYPTION_KEY
    t.after(() => { process.env.ENCRYPTION_KEY = previous })
    delete process.env.ENCRYPTION_KEY
    t.mock.method(Password.collection, 'insertOne', () => assert.fail('Não deve persistir senha sem criptografia'))
    await assert.rejects(new Password(validPassword).save(), /ENCRYPTION_KEY/)
})
