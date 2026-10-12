const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const crypto = require('node:crypto');

function environment(port) {
  const uri = new URL(process.env.TEST_MONGODB_URI);
  uri.pathname = '/minhassenhas_test_bootstrap_' + crypto.randomBytes(8).toString('hex');
  const env = {
    ...process.env,
    PORT: String(port),
    MONGODB_URI: uri.toString(),
    NODE_ENV: 'test',
    AUTH_SECRET: crypto.randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
    SWAGGER_ENABLED: 'false',
  };
  // O filho é a aplicação, não outro worker do runner node:test.
  delete env.NODE_TEST_CONTEXT;
  return env;
}

test(
  'entrada de produção inicia API compilada',
  { skip: !process.env.TEST_MONGODB_URI, timeout: 20000 },
  async (t) => {
    const reservation = net.createServer();
    reservation.listen(0);
    await once(reservation, 'listening');
    const port = reservation.address().port;
    await new Promise((resolve) => reservation.close(resolve));
    const child = spawn(process.execPath, ['dist/main.js'], {
      env: environment(port),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const exited = once(child, 'exit');
    t.after(async () => {
      if (child.exitCode === null && child.signalCode === null) child.kill();
      await exited;
    });
    child.stdout.resume();
    child.stderr.resume();
    let response;
    for (let attempt = 0; attempt < 100; attempt++) {
      assert.equal(child.exitCode, null, 'Bootstrap encerrou antes de ouvir HTTP');
      try {
        response = await fetch('http://127.0.0.1:' + port + '/oapi/validateToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'invalido' }),
        });
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.ok(response, 'Bootstrap não disponibilizou HTTP');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { valid: false });
  },
);

test(
  'porta ocupada encerra bootstrap e conexão MongoDB sem pendurar processo',
  { skip: !process.env.TEST_MONGODB_URI, timeout: 20000 },
  async (t) => {
    const reservation = net.createServer();
    // Mesmo bind do main.ts: em Windows, IPv4 e IPv6 podem aceitar binds distintos.
    reservation.listen(0);
    await once(reservation, 'listening');
    t.after(() => new Promise((resolve) => reservation.close(resolve)));
    const child = spawn(process.execPath, ['dist/main.js'], {
      env: environment(reservation.address().port),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const exited = once(child, 'exit');
    t.after(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill();
    });
    child.stdout.resume();
    child.stderr.resume();
    const [code] = await exited;
    assert.equal(code, 1);
  },
);
