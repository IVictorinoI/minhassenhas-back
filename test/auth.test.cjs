const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.AUTH_SECRET = 'unit-test-secret-'.repeat(4);
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User } = require('./helpers/application.cjs');
const { service } = require('./helpers/application.cjs');
const { auth } = require('./helpers/application.cjs');
const secret = process.env.AUTH_SECRET;
const credentials = {
  name: 'Maria',
  email: 'maria@example.com',
  password: 'Senha123!',
  confirm_password: 'Senha123!',
};
function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    send(body) {
      return this.json(body);
    },
  };
}
function assertError(res, status, message) {
  assert.equal(res.statusCode, status);
  assert.deepEqual(res.body, { errors: [message] });
}
function noDatabase(t) {
  for (const method of ['findOne', 'exists', 'create'])
    t.mock.method(User, method, () => {
      throw new Error('A validação deveria impedir acesso ao banco');
    });
}
for (const [label, body, message] of [
  ['corpo ausente', undefined, 'O e-mail informado está inválido.'],
  ['email inválido', { email: 'invalido' }, 'O e-mail informado está inválido.'],
  ['nome vazio', { name: '   ' }, 'Informe nome e senha de até 72 bytes.'],
  ['senha vazia', { password: '', confirm_password: '' }, 'Informe nome e senha de até 72 bytes.'],
  [
    'senha acima de 72 bytes',
    { password: 'a'.repeat(73) },
    'Informe nome e senha de até 72 bytes.',
  ],
  [
    'Unicode acima de 72 bytes',
    { password: '🔐'.repeat(19) },
    'Informe nome e senha de até 72 bytes.',
  ],
  ['confirmação divergente', { confirm_password: 'outra' }, 'Senhas não conferem.'],
  ...['name', 'email', 'password', 'confirm_password'].map((field) => [
    field + ' com objeto',
    { [field]: { $ne: null } },
    'Dados inválidos.',
  ]),
])
  test('cadastro rejeita ' + label + ' antes de consultar banco', async (t) => {
    noDatabase(t);
    const res = response();
    await service.signup(
      { body: body === undefined ? undefined : { ...credentials, ...body } },
      res,
    );
    assertError(res, 400, message);
  });
test('cadastro duplicado não grava nem gera token', async (t) => {
  t.mock.method(User, 'exists', async () => ({ _id: 'existente' }));
  t.mock.method(User, 'create', () => assert.fail('Não deve cadastrar duplicata'));
  const res = response();
  await service.signup({ body: credentials }, res);
  assertError(res, 400, 'Usuário já cadastrado.');
});
for (const password of ['Senha123!', 'a'.repeat(72), '🔐'.repeat(18)])
  test(
    'cadastro armazena hash verificável e emite JWT: ' + Buffer.byteLength(password) + ' bytes',
    async (t) => {
      let stored;
      t.mock.method(User, 'exists', async () => null);
      t.mock.method(User, 'create', async (data) => {
        stored = { ...data, _id: '507f1f77bcf86cd799439011' };
        return stored;
      });
      t.mock.method(User, 'findOne', async () => stored);
      const res = response();
      await service.signup(
        { body: { ...credentials, password, confirm_password: password, admin: true } },
        res,
      );
      assert.equal(res.statusCode, 200);
      assert.notEqual(stored.password, password);
      assert.equal(await bcrypt.compare(password, stored.password), true);
      assert.deepEqual(Object.keys(stored).sort(), ['_id', 'email', 'name', 'password']);
      assert.deepEqual(Object.keys(res.body).sort(), ['email', 'name', 'token']);
      const payload = jwt.verify(res.body.token, secret, { algorithms: ['HS256'] });
      assert.equal(payload._id, stored._id);
      assert.equal(payload.name, credentials.name);
      assert.equal(payload.email, credentials.email);
      assert.equal(payload.exp - payload.iat, 86400);
      assert.equal(payload.password, undefined);
    },
  );
for (const field of ['email', 'password'])
  test('login rejeita objeto em ' + field, async (t) => {
    noDatabase(t);
    const res = response();
    await service.login({ body: { ...credentials, [field]: { $ne: null } } }, res);
    assertError(res, 400, 'Credenciais inválidas.');
  });
for (const label of ['usuário inexistente', 'senha incorreta', 'corpo ausente'])
  test('login não emite token: ' + label, async (t) => {
    const hash = await bcrypt.hash('correta', 4);
    t.mock.method(User, 'findOne', async () =>
      label === 'senha incorreta' ? { password: hash } : null,
    );
    const res = response();
    await service.login({ body: label === 'corpo ausente' ? undefined : credentials }, res);
    assertError(res, 400, 'Usuário/Senha inválidos.');
  });
test('login válido retorna somente identidade pública e JWT assinado', async (t) => {
  const user = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Maria',
    email: credentials.email,
    password: await bcrypt.hash(credentials.password, 4),
  };
  t.mock.method(User, 'findOne', async (filter) => {
    assert.deepEqual(filter, { email: credentials.email });
    return user;
  });
  const res = response();
  await service.login({ body: credentials }, res);
  const payload = jwt.verify(res.body.token, secret, { algorithms: ['HS256'] });
  assert.deepEqual(Object.keys(res.body).sort(), ['email', 'name', 'token']);
  assert.equal(payload._id, user._id);
  assert.equal(payload.exp - payload.iat, 86400);
  assert.equal(payload.password, undefined);
});
for (const operation of ['login', 'signup'])
  test(operation + ' propaga falha de persistência para tratamento central', async (t) => {
    const error = new Error('banco indisponível');
    t.mock.method(User, operation === 'login' ? 'findOne' : 'exists', async () => {
      throw error;
    });
    await assert.rejects(service[operation]({ body: credentials }, response()), error);
  });
const validToken = () =>
  jwt.sign({ _id: 'usuario', name: 'Maria' }, secret, { algorithm: 'HS256', expiresIn: '1h' });
const invalidTokens = [
  ['ausente', undefined],
  ['vazio', ''],
  ['malformado', 'invalid'],
  ['assinatura errada', jwt.sign({ _id: 'usuario' }, 'outro-segredo')],
  ['expirado', jwt.sign({ _id: 'usuario' }, secret, { expiresIn: -1 })],
  ['algoritmo não permitido', jwt.sign({ _id: 'usuario' }, secret, { algorithm: 'HS384' })],
  ['ainda não válido', jwt.sign({ _id: 'usuario' }, secret, { notBefore: '1h' })],
  ['objeto', {}],
];
for (const [label, token] of invalidTokens)
  test('validateToken retorna false: ' + label, () => {
    const res = response();
    service.validateToken({ body: { token } }, res);
    assert.deepEqual(res.body, { valid: false });
  });
test('validateToken aceita token válido e corpo ausente é inválido', () => {
  const res = response();
  service.validateToken({ body: { token: validToken() } }, res);
  assert.deepEqual(res.body, { valid: true });
  service.validateToken({}, res);
  assert.deepEqual(res.body, { valid: false });
});
for (const source of ['bearer', 'raw', 'body', 'query'])
  test('middleware aceita token em ' + source, () => {
    const token = validToken();
    const req = { method: 'GET', headers: {}, query: {} };
    if (source === 'bearer') req.headers.authorization = 'bEaReR ' + token;
    if (source === 'raw') req.headers.authorization = token;
    if (source === 'body') req.body = { token };
    if (source === 'query') req.query.token = token;
    let calls = 0;
    auth(req, response(), () => calls++);
    assert.equal(calls, 1);
    assert.equal(req.user._id, 'usuario');
  });
for (const [label, token] of invalidTokens)
  test('middleware bloqueia token ' + label, () => {
    const res = response();
    const req = { method: 'GET', headers: { authorization: token }, query: {} };
    auth(req, res, () => assert.fail('Não deve permitir acesso'));
    assert.equal(res.statusCode, 403);
    assert.equal(req.user, undefined);
    assert.ok(Array.isArray(res.body.errors));
  });
test('middleware libera preflight sem token', () => {
  let calls = 0;
  auth({ method: 'OPTIONS' }, response(), () => calls++);
  assert.equal(calls, 1);
});

for (const operation of ['create', 'hash'])
  test('cadastro não emite token quando falha ' + operation, async (t) => {
    const error = new Error('falha ' + operation);
    t.mock.method(User, 'exists', async () => null);
    t.mock.method(User, 'findOne', () => assert.fail('Não deve autenticar cadastro que falhou'));
    if (operation === 'hash') {
      t.mock.method(bcrypt, 'hash', async () => {
        throw error;
      });
      t.mock.method(User, 'create', () => assert.fail('Não deve persistir quando hash falha'));
    } else
      t.mock.method(User, 'create', async () => {
        throw error;
      });
    const res = response();
    await assert.rejects(service.signup({ body: credentials }, res), error);
    assert.equal(res.body, undefined);
  });
