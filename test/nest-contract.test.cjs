const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');
process.env.AUTH_SECRET = 'nest-contract-test-secret-'.repeat(3);
process.env.ENCRYPTION_KEY = 'ab'.repeat(32);
const { createTestApp, User, Password, service } = require('./helpers/application.cjs');

const owner = '507f1f77bcf86cd799439011';
const token = jwt.sign({ _id: owner }, process.env.AUTH_SECRET);
async function client(t, options) {
  const app = await createTestApp(options);
  t.after(() => app.close());
  await app.listen(0, '127.0.0.1');
  const url = 'http://127.0.0.1:' + app.getHttpServer().address().port;
  return {
    app,
    url,
    request: (path, body, method = 'POST', headers = {}) =>
      fetch(url + path, {
        method,
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
  };
}
for (const body of [
  { description: 'Conta', login: 'login', password: { $ne: null } },
  { description: null, login: 'login', password: 'segredo' },
  { description: 'Conta', login: 'login', password: 'segredo', url: {} },
]) {
  test('DTO rejeita credencial inválida antes de persistir: ' + JSON.stringify(body), async (t) => {
    t.mock.method(Password, 'create', () => assert.fail('Não deve acessar persistência'));
    const { request } = await client(t);
    const res = await request('/api/passwords', body);
    assert.equal(res.status, 400);
    assert.ok(Array.isArray((await res.json()).errors));
  });
}
test('DTO de atualização rejeita null antes de consultar banco', async (t) => {
  t.mock.method(Password, 'findOne', () => assert.fail('Não deve acessar persistência'));
  const { request } = await client(t);
  const res = await request('/api/passwords/' + owner, { password: null }, 'PUT');
  assert.equal(res.status, 400);
});
test('guard rejeita JWT assinado sem identidade válida', async (t) => {
  t.mock.method(Password, 'find', () => assert.fail('Não deve acessar persistência'));
  const { request } = await client(t);
  for (const payload of [{}, { _id: {} }, { _id: '' }]) {
    const res = await request('/api/passwords/myPasswords', undefined, 'GET', {
      Authorization: 'Bearer ' + jwt.sign(payload, process.env.AUTH_SECRET),
    });
    assert.equal(res.status, 403);
  }
});
test('limite de autenticação retorna 429 no formato da API', async (t) => {
  t.mock.method(User, 'findOne', async () => null);
  const { request } = await client(t, { rateLimit: 2 });
  assert.equal(
    (await request('/oapi/login', { email: 'maria@example.com', password: 'errada' })).status,
    400,
  );
  assert.equal(
    (await request('/oapi/login', { email: 'maria@example.com', password: 'errada' })).status,
    400,
  );
  const limited = await request('/oapi/login', { email: 'maria@example.com', password: 'errada' });
  assert.equal(limited.status, 429);
  assert.ok(Array.isArray((await limited.json()).errors));
});
test('documentação OpenAPI descreve rotas, DTOs e bearer auth', async (t) => {
  const { request } = await client(t, { swagger: true });
  const res = await request('/docs-json', undefined, 'GET');
  assert.equal(res.status, 200);
  const document = await res.json();
  assert.ok(document.paths['/oapi/signup'].post);
  assert.ok(document.paths['/api/passwords/myPasswords'].get);
  assert.ok(document.components.schemas.CreatePasswordDto.required.includes('password'));
  assert.ok(document.components.securitySchemes.bearer);
  const ui = await request('/docs', undefined, 'GET');
  assert.equal(ui.status, 200);
  assert.match(await ui.text(), /swagger-ui/);
});
test('documentação não é exposta quando desabilitada', async (t) => {
  const { request } = await client(t);
  assert.equal((await request('/docs-json', undefined, 'GET')).status, 404);
});
test('respostas usam cabeçalhos de segurança e impedem cache', async (t) => {
  const { request } = await client(t);
  const res = await request('/oapi/validateToken', { token: 'invalido' });
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});
test('CORS respeita lista de origens configurada', async (t) => {
  const { request } = await client(t, { origins: 'https://app.example.com' });
  const allowed = await request('/oapi/validateToken', { token: 'invalido' }, 'POST', {
    Origin: 'https://app.example.com',
  });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://app.example.com');
  const blocked = await request('/oapi/validateToken', { token: 'invalido' }, 'POST', {
    Origin: 'https://other.example.com',
  });
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});
test('gateway mantém conexão Socket.IO no namespace legado', async (t) => {
  const { url } = await client(t);
  const socket = io(url + '/api/', {
    transports: ['websocket'],
    reconnection: false,
    timeout: 3000,
  });
  t.after(() => socket.disconnect());
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  assert.equal(socket.connected, true);
  socket.disconnect();
});
test('cadastro concorrente traduz erro de índice único sem emitir token', async (t) => {
  t.mock.method(User, 'exists', async () => null);
  t.mock.method(User, 'create', async () => {
    throw Object.assign(new Error('duplicate key'), { code: 11000 });
  });
  t.mock.method(User, 'findOne', () => assert.fail('Não deve emitir token'));
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
    },
  };
  await service.signup(
    {
      body: {
        name: 'Maria',
        email: 'maria@example.com',
        password: 'senha',
        confirm_password: 'senha',
      },
    },
    res,
  );
  assert.equal(res.code, 400);
  assert.deepEqual(res.body, { errors: ['Usuário já cadastrado.'] });
});
