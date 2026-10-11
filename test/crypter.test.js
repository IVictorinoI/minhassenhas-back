const { test } = require('node:test')
const assert = require('node:assert/strict')
process.env.ENCRYPTION_KEY = 'ab'.repeat(32)
const { encrypt, decrypt } = require('../src/api/common/crypter')
test('criptografia autenticada usa IV aleatório e preserva Unicode', () => {
    const value = 'Senha ç🔐'
    const first = encrypt(value)
    assert.notEqual(first, encrypt(value))
    assert.equal(decrypt(first), value)
    const parts = first.split(':')
    parts[2] = '00'.repeat(16)
    assert.throws(() => decrypt(parts.join(':')))
})
test('lê senhas produzidas pelo Node 14 sem alterar o acervo', () => {
    assert.equal(decrypt('b96c38ef1192908418f41fbf7556888126bfaafba9f3bcaec3a47c8eb2d09667f5e0de2651e13947d4e2063c0a139427'), 'senha-legada')
    assert.equal(decrypt('texto antigo'), 'texto antigo')
})