const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const errorHandler = require('../src/api/common/errorHandler')
function response() {
    return { statusCode: 200, status(code) { this.statusCode = code; return this }, json(body) { this.body = body; return this } }
}
test('tratamento delega erro quando cabeçalhos já foram enviados', () => {
    const error = new Error('falha')
    let received
    const res = response()
    res.headersSent = true
    errorHandler(error, {}, res, err => { received = err })
    assert.equal(received, error)
    assert.equal(res.body, undefined)
})
test('erro interno não revela informações sensíveis na resposta', t => {
    const error = new Error('segredo de conexão')
    const log = t.mock.method(console, 'error', () => {})
    const res = response()
    errorHandler(error, {}, res, () => assert.fail('Não deve delegar'))
    assert.equal(res.statusCode, 500)
    assert.deepEqual(res.body, { errors: ['Erro interno do servidor.'] })
    assert.equal(log.mock.calls[0].arguments[0], error)
})
for (const secret of [undefined, '', 'a'.repeat(31), 'a'.repeat(32), 'a'.repeat(64)]) test('configuração valida segredo JWT: ' + (secret?.length ?? 'ausente'), () => {
    const env = { ...process.env }
    if (secret === undefined) delete env.AUTH_SECRET
    else env.AUTH_SECRET = secret
    const result = spawnSync(process.execPath, ['-e', 'require(' + JSON.stringify(path.resolve(__dirname, '../src/config/env.js')) + ')'], { env, encoding: 'utf8' })
    assert.ifError(result.error)
    if (!secret || secret.length < 32) {
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, /AUTH_SECRET/)
    } else assert.equal(result.status, 0, result.stderr)
})
