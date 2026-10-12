const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
process.env.AUTH_SECRET = crypto.randomBytes(32).toString('hex');
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
const { NestFactory } = require('@nestjs/core');
const { getConnectionToken, getModelToken } = require('@nestjs/mongoose');
const { ApiExpressAdapter } = require('../dist/config/api-express.adapter');
const { configureApp } = require('../dist/config/configure-app');

test(
  'cadastro, JWT, CRUD e isolamento entre usuários',
  { skip: !process.env.TEST_MONGODB_URI },
  async (t) => {
    // Banco exclusivo por execução: nunca limpa o banco da aplicação.
    const uri = new URL(process.env.TEST_MONGODB_URI);
    uri.pathname = '/minhassenhas_test_' + crypto.randomBytes(8).toString('hex');
    process.env.MONGODB_URI = uri.toString();
    process.env.NODE_ENV = 'test';
    process.env.SWAGGER_ENABLED = 'false';
    process.env.AUTH_RATE_LIMIT = '1000';
    const { AppModule } = require('../dist/app.module');
    const app = await NestFactory.create(AppModule, new ApiExpressAdapter(), {
      logger: false,
      abortOnError: false,
    });
    const connection = app.get(getConnectionToken());
    const Password = app.get(getModelToken('Password'));
    const User = app.get(getModelToken('User'));
    t.after(async () => {
      try {
        await connection.dropDatabase();
      } finally {
        await app.close();
      }
    });
    await User.createIndexes();
    await Password.createIndexes();
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    const server = app.getHttpServer();
    const base = 'http://127.0.0.1:' + server.address().port;
    const request = async (path, method = 'GET', body, token) => {
      const response = await fetch(base + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, body: await response.json() };
    };
    const signup = async (email) => {
      const result = await request('/oapi/signup', 'POST', {
        name: 'Teste',
        email,
        password: 'Senha123!',
        confirm_password: 'Senha123!',
      });
      assert.equal(result.status, 200);
      return result.body.token;
    };
    const concurrent = await Promise.all(
      [1, 2].map(() =>
        request('/oapi/signup', 'POST', {
          name: 'Concorrente',
          email: 'concorrente@example.com',
          password: 'Senha123!',
          confirm_password: 'Senha123!',
        }),
      ),
    );
    assert.deepEqual(concurrent.map((result) => result.status).sort(), [200, 400]);
    assert.equal(await User.countDocuments({ email: 'concorrente@example.com' }), 1);
    const first = await signup('primeiro@example.com');
    const second = await signup('segundo@example.com');
    const payload = require('jsonwebtoken').decode(first);
    assert.equal(payload.password, undefined);
    assert.equal((await request('/oapi/validateToken', 'POST', { token: first })).body.valid, true);
    assert.equal(
      (await request('/oapi/validateToken', 'POST', { token: 'inválido' })).body.valid,
      false,
    );
    assert.equal(
      (
        await request('/oapi/login', 'POST', {
          email: 'primeiro@example.com',
          password: 'Senha123!',
        })
      ).status,
      200,
    );
    assert.equal(
      (await request('/oapi/login', 'POST', { email: 'primeiro@example.com', password: 'errada' }))
        .status,
      400,
    );
    assert.equal((await request('/api/passwords/myPasswords')).status, 403);
    const created = await request(
      '/api/passwords/',
      'POST',
      { _id: '', description: 'Exemplo', login: 'teste', password: 'segredo', user: payload._id },
      first,
    );
    assert.equal(created.status, 201);
    assert.equal(created.body.password, undefined);
    const id = created.body._id;
    assert.match(id, /^[a-f\d]{24}$/i);
    const stored = await Password.findById(id);
    assert.match(stored.password, /^v2:/);
    assert.equal(
      (await request('/api/passwords/myPasswords', 'GET', undefined, first)).body.length,
      1,
    );
    assert.equal(
      (await request('/api/passwords/myPasswords', 'GET', undefined, second)).body.length,
      0,
    );
    const view = '/api/passwords/viewPassword?_id=' + id;
    assert.equal((await request(view, 'GET', undefined, first)).body.password, 'segredo');
    assert.equal((await request(view, 'GET', undefined, second)).status, 404);
    assert.equal(
      (await request('/api/passwords/' + id, 'PUT', { password: 'invasor' }, second)).status,
      404,
    );
    assert.equal((await request('/api/passwords/' + id, 'DELETE', undefined, second)).status, 404);
    assert.equal(
      (await request('/api/passwords/' + id, 'PUT', { password: 'novo' }, first)).status,
      200,
    );
    assert.equal((await request(view, 'GET', undefined, first)).body.password, 'novo');
    assert.equal(
      (await request('/api/passwords/' + id, 'PUT', { description: 'Alterada' }, first)).status,
      200,
    );
    assert.equal((await request(view, 'GET', undefined, first)).body.password, 'novo');
    assert.equal(
      (await request('/api/passwords/viewPassword?_id=invalido', 'GET', undefined, first)).status,
      400,
    );
    assert.equal((await request('/api/passwords/' + id, 'DELETE', undefined, first)).status, 200);
    assert.equal((await request(view, 'GET', undefined, first)).status, 404);
    const { Types } = require('mongoose');
    for (const legacy of [
      'texto antigo',
      'b96c38ef1192908418f41fbf7556888126bfaafba9f3bcaec3a47c8eb2d09667f5e0de2651e13947d4e2063c0a139427',
    ]) {
      const legacyId = new Types.ObjectId();
      await Password.collection.insertOne({
        _id: legacyId,
        user: new Types.ObjectId(payload._id),
        description: 'Legada',
        login: 'antigo',
        password: legacy,
      });
      const legacyView = '/api/passwords/viewPassword?_id=' + legacyId;
      const expected = legacy === 'texto antigo' ? legacy : 'senha-legada';
      assert.equal((await request(legacyView, 'GET', undefined, first)).body.password, expected);
      assert.equal(
        (await request('/api/passwords/' + legacyId, 'PUT', { description: 'Metadados' }, first))
          .status,
        200,
      );
      assert.equal((await Password.findById(legacyId)).password, legacy);
      assert.equal(
        (await request('/api/passwords/' + legacyId, 'PUT', { password: expected }, first)).status,
        200,
      );
      const migrated = await Password.findById(legacyId);
      assert.match(migrated.password, /^v2:/);
      assert.equal((await request(legacyView, 'GET', undefined, first)).body.password, expected);
    }
  },
);
