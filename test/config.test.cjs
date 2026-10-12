require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { Logger } = require('@nestjs/common');
const { ApiExceptionFilter } = require('../dist/common/filters/api-exception.filter');
const { validateEnvironment } = require('../dist/config/environment');
function filterContext() {
  const res = { headersSent: false };
  const adapter = {
    isHeadersSent: (r) => r.headersSent,
    end: (r) => {
      r.ended = true;
    },
    reply: (r, body, status) => {
      r.body = body;
      r.statusCode = status;
    },
  };
  return {
    res,
    filter: new ApiExceptionFilter({ httpAdapter: adapter }),
    host: { switchToHttp: () => ({ getResponse: () => res }) },
  };
}
test('tratamento encerra resposta quando cabeçalhos já foram enviados', () => {
  const { res, filter, host } = filterContext();
  res.headersSent = true;
  filter.catch(new Error('falha'), host);
  assert.equal(res.ended, true);
  assert.equal(res.body, undefined);
});
test('erro interno não revela informações sensíveis na resposta nem no log', (t) => {
  const log = t.mock.method(Logger.prototype, 'error', () => {});
  const { res, filter, host } = filterContext();
  filter.catch(new Error('segredo de conexão'), host);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { errors: ['Erro interno do servidor.'] });
  assert.equal(log.mock.callCount(), 1);
  assert.doesNotMatch(JSON.stringify(log.mock.calls), /segredo de conexão/);
});
for (const secret of [undefined, '', 'a'.repeat(31), 'a'.repeat(32), 'a'.repeat(64)])
  test('configuração valida segredo JWT: ' + (secret?.length ?? 'ausente'), () => {
    const env = { ...process.env, ENCRYPTION_KEY: 'ab'.repeat(32) };
    if (secret === undefined) delete env.AUTH_SECRET;
    else env.AUTH_SECRET = secret;
    const code =
      'require(' +
      JSON.stringify(path.resolve(__dirname, '../dist/config/environment.js')) +
      ').validateEnvironment(process.env)';
    const result = spawnSync(process.execPath, ['-e', code], { env, encoding: 'utf8' });
    assert.ifError(result.error);
    if (!secret || secret.length < 32) {
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /AUTH_SECRET/);
    } else assert.equal(result.status, 0, result.stderr);
  });
test('configuração rejeita porta, URI, ambiente, chave, origens e limites inválidos', () => {
  const valid = { AUTH_SECRET: 'a'.repeat(32), ENCRYPTION_KEY: 'ab'.repeat(32) };
  for (const invalid of [
    { PORT: 0 },
    { PORT: 65536 },
    { PORT: 1.5 },
    { MONGODB_URI: 'https://example.com' },
    { NODE_ENV: 'invalid' },
    { ENCRYPTION_KEY: 'invalid' },
    { CORS_ORIGINS: '' },
    { CORS_ORIGINS: 'invalid' },
    { SWAGGER_ENABLED: 'yes' },
    { AUTH_RATE_LIMIT: 0 },
    { AUTH_RATE_TTL_MS: -1 },
  ]) {
    assert.throws(() => validateEnvironment({ ...valid, ...invalid }));
  }
  assert.equal(validateEnvironment({ ...valid, NODE_ENV: 'production' }).SWAGGER_ENABLED, false);
});
