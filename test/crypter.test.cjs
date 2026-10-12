const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
process.env.ENCRYPTION_KEY = 'ab'.repeat(32);
const {
  crypter: { encrypt, decrypt, encryptionKey },
} = require('./helpers/application.cjs');
const key = process.env.ENCRYPTION_KEY;
for (const value of ['', 'simples', 'Senha ç🔐\n\u0000', 'x'.repeat(10000)])
  test('criptografia preserva conteúdo: ' + value.length + ' caracteres', () => {
    assert.equal(decrypt(encrypt(value)), value);
  });
test('criptografia usa IV aleatório e autentica IV, tag e ciphertext', () => {
  const first = encrypt('segredo');
  assert.notEqual(first, encrypt('segredo'));
  for (const index of [1, 2, 3]) {
    const parts = first.split(':');
    parts[index] = (parts[index].startsWith('00') ? '01' : '00') + parts[index].slice(2);
    assert.throws(() => decrypt(parts.join(':')));
  }
});
for (const value of ['v2:', 'v2:00:00:00', 'v2:invalid:invalid:invalid'])
  test('payload autenticado malformado falha sem retornar texto: ' + value, () => {
    assert.throws(() => decrypt(value));
  });
test('chave diferente não descriptografa dados autenticados', (t) => {
  const encrypted = encrypt('segredo');
  t.after(() => {
    process.env.ENCRYPTION_KEY = key;
  });
  process.env.ENCRYPTION_KEY = 'cd'.repeat(32);
  assert.throws(() => decrypt(encrypted));
});
for (const value of [undefined, '', 'ab'.repeat(31), 'ab'.repeat(33), 'zz'.repeat(32)])
  test('rejeita chave inválida: ' + String(value), (t) => {
    t.after(() => {
      process.env.ENCRYPTION_KEY = key;
    });
    if (value === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = value;
    assert.throws(encryptionKey, /ENCRYPTION_KEY/);
    assert.throws(() => encrypt('segredo'), /ENCRYPTION_KEY/);
  });
test('aceita chave hexadecimal em maiúsculas', (t) => {
  t.after(() => {
    process.env.ENCRYPTION_KEY = key;
  });
  process.env.ENCRYPTION_KEY = key.toUpperCase();
  assert.equal(encryptionKey().length, 32);
  assert.equal(decrypt(encrypt('segredo')), 'segredo');
});
test('lê fixture histórica produzida pelo Node 14', () => {
  assert.equal(
    decrypt(
      'b96c38ef1192908418f41fbf7556888126bfaafba9f3bcaec3a47c8eb2d09667f5e0de2651e13947d4e2063c0a139427',
    ),
    'senha-legada',
  );
});
for (const value of ['texto antigo', '', 'deadbeef'])
  test('preserva texto anterior sem criptografia: ' + value, () => {
    assert.equal(decrypt(value), value);
  });
test('AES-CBC sem marcador histórico é preservado como texto original', () => {
  const password = Buffer.from('Abacaxi');
  const legacyKey = crypto.createHash('md5').update(password).digest();
  const iv = crypto
    .createHash('md5')
    .update(Buffer.concat([legacyKey, password]))
    .digest();
  const cipher = crypto.createCipheriv('aes-128-cbc', legacyKey, iv);
  const encrypted = Buffer.concat([cipher.update('sem marcador', 'utf8'), cipher.final()]).toString(
    'hex',
  );
  assert.equal(decrypt(encrypted), encrypted);
});
