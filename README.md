# Minhas Senhas — Backend

API NestJS 12 e TypeScript 6 para autenticação e gerenciamento de credenciais pessoais. O frontend React continua independente e utiliza os mesmos endpoints HTTP.

## Arquitetura

A aplicação é um monólito modular com TypeScript estrito e injeção de dependências:

```text
src/
  main.ts                     # Bootstrap Nest e encerramento da aplicação
  app.module.ts               # Composição de produção
  api.module.ts               # Controllers, validação e filtros HTTP
  config/                     # Ambiente, HTTP, OpenAPI e adaptadores
  database/                   # Conexão Mongoose e comando de índices
  common/                     # Filtro de erros, pipes e validação
  modules/
    auth/                     # Cadastro, login, JWT, guard e CurrentUser
    users/                    # Schema e repositório de usuários
    passwords/                # DTOs, controller, service, repositório e schema
    crypto/                   # AES-GCM e leitura de formatos legados
    realtime/                 # Gateway Socket.IO de compatibilidade
scripts/dev.mjs               # Recompilação e execução em desenvolvimento
test/                         # node:test: unidades, contratos e MongoDB real
docs/decisoes-arquiteturais/   # ADRs e critérios de evolução
```

Controllers recebem HTTP; DTOs validam os dados; services executam regras; repositories concentram acesso ao MongoDB. A criptografia acontece no service antes da persistência, sem hooks Mongoose. O proprietário sempre vem do JWT verificado.

Consulte o [registro de decisões arquiteturais](docs/decisoes-arquiteturais/README.md) para contexto, alternativas e consequências da migração. Novas funcionalidades devem respeitar os limites dos módulos e registrar decisões que alterem esses limites.

## Requisitos

- Node.js 24 LTS como referência. Compatibilidade declarada: `^22.22.0 || >=24.11.0`.
- npm e MongoDB 7 ou superior.
- TypeScript é compilado para JavaScript ESM em `dist`; o código de produção está integralmente em TypeScript.

## Instalação e desenvolvimento

```powershell
npm ci
Copy-Item .env.example .env
```

No Linux/macOS, use `cp .env.example .env`. Para uma instalação nova, gere dois valores independentes:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Execute duas vezes e preencha `AUTH_SECRET` e `ENCRYPTION_KEY`. Em uma instalação existente, preserve as chaves atuais, principalmente `ENCRYPTION_KEY`.

Com o MongoDB disponível:

```sh
npm run db:indexes
npm run dev
```

A API usa `http://localhost:3000`. O watcher recompila com `tsc` ao alterar `src` e reinicia a aplicação. A configuração é carregada de `.env`; variáveis definidas no ambiente têm prioridade. Erros de configuração impedem o startup.

Em PowerShell com bloqueio de `npm.ps1`, utilize `npm.cmd` nos comandos.

## Configuração

| Variável | Finalidade | Padrão |
| --- | --- | --- |
| `NODE_ENV` | `development`, `test` ou `production` | `development` |
| `PORT` | Porta HTTP | `3000` |
| `MONGODB_URI` | Conexão MongoDB | `mongodb://127.0.0.1:27017/minhassenhas` |
| `AUTH_SECRET` | Segredo JWT com pelo menos 32 caracteres | Obrigatório |
| `ENCRYPTION_KEY` | Chave AES de 32 bytes em 64 caracteres hexadecimais | Obrigatório |
| `CORS_ORIGINS` | `*` ou origens HTTP separadas por vírgula, sem barra final | `*` |
| `SWAGGER_ENABLED` | Publica `/docs` e `/docs-json` | `false` em produção; `true` nos demais ambientes |
| `AUTH_RATE_LIMIT` | Limite por IP e rota de autenticação | `20` |
| `AUTH_RATE_TTL_MS` | Janela do limite em milissegundos | `60000` |
| `TEST_MONGODB_URI` | Habilita integração em banco exclusivo de teste | Ausente |

O `.env.example` é voltado ao desenvolvimento e define Swagger explicitamente como `true`. Ajuste esse valor para produção. Use origens concretas do frontend em produção. HTTP e Socket.IO compartilham a configuração CORS.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Compila e acompanha alterações em `src` |
| `npm run build` | Gera o build ESM em `dist` |
| `npm start` / `npm run production` | Executa `dist/main.js`, já compilado |
| `npm run typecheck` | Verifica tipos sem emitir arquivos |
| `npm run lint` | Executa ESLint com análise de tipos |
| `npm run format` / `npm run format:check` | Formata / verifica código com Prettier |
| `npm test` | Compila e executa a suíte completa |
| `npm run test:unit` | Unidades, configuração, schemas e criptografia |
| `npm run test:contracts` | Contratos HTTP e funcionalidades Nest |
| `npm run test:integration` | AppModule de produção e MongoDB real |
| `npm run test:coverage` | Cobertura do JavaScript compilado |
| `npm run check` | Tipos, lint, formatação, build e testes |
| `npm run db:indexes` | Compila e cria/verifica índices declarados |

Não execute `src/main.ts` diretamente com a remoção nativa de tipos do Node: o Nest depende da metadata de decorators emitida pelo compilador.

## API e OpenAPI

Em desenvolvimento, consulte `http://localhost:3000/docs`; o contrato JSON fica em `/docs-json`. Em produção, a documentação fica desabilitada por padrão.

Envie JSON com `Content-Type: application/json`. Prefira `Authorization: Bearer <token>`. O header contendo diretamente o token continua aceito para o frontend atual. Body/query também continuam aceitos por compatibilidade; evite tokens em URLs.

| Método | Endpoint | Autenticação | Finalidade |
| --- | --- | --- | --- |
| POST | `/oapi/signup` | Pública | Cadastro e emissão de token |
| POST | `/oapi/login` | Pública | Login e emissão de token |
| POST | `/oapi/validateToken` | Pública | Validação de token |
| GET | `/api/passwords/myPasswords` | JWT | Lista credenciais por descrição |
| GET | `/api/passwords/viewPassword?_id=<id>` | JWT | Retorna a senha descriptografada |
| POST | `/api/passwords/` | JWT | Cria uma credencial |
| PUT | `/api/passwords/<id>` | JWT | Atualiza os campos enviados |
| DELETE | `/api/passwords/<id>` | JWT | Exclui uma credencial |

Cadastro:

```json
{
  "name": "Maria",
  "email": "maria@example.com",
  "password": "MinhaSenha123!",
  "confirm_password": "MinhaSenha123!"
}
```

Login recebe `email` e `password`. Cadastro e login retornam `{ "name": "...", "email": "...", "token": "..." }`. JWT usa HS256 e expira em um dia. A senha de autenticação é armazenada como hash bcrypt de custo 12; novos cadastros aceitam até 72 bytes UTF-8.

Validação recebe `{ "token": "..." }` e retorna `{ "valid": true }` ou `{ "valid": false }`.

Criação de credencial:

```json
{
  "description": "Conta pessoal",
  "login": "maria@example.com",
  "url": "https://example.com",
  "password": "segredo-da-conta"
}
```

`description`, `login` e `password` são strings obrigatórias e não vazias; `url` é uma string opcional. Campos extras são ignorados. Objetos no lugar de strings e `null` em campos de atualização são rejeitados. `PUT` preserva os campos omitidos. O campo `user` recebido nunca define o proprietário.

Listagem e respostas de criação/alteração/exclusão retornam somente `_id`, `description`, `login` e `url`. A senha é exposta apenas em `viewPassword`, no formato `{ "password": "..." }`.

Erros retornam `{ "errors": ["mensagem"] }`: `400` para dados inválidos, `403` para autenticação ausente/inválida, `404` para credencial inexistente ou de outro usuário, `429` para limite de autenticação e `500` para falha interna. Criação de credencial retorna `201`; demais operações válidas retornam `200`.

## Dados, índices e criptografia

As coleções `users` e `passwords` e seus identificadores são preservados. Os índices declarados são:

- `users_email_unique`: e-mail único, impedindo cadastros concorrentes duplicados.
- `passwords_user_description`: consultas por proprietário ordenadas por descrição.

`autoIndex` está desabilitado. Aplique `npm run db:indexes` na preparação do ambiente ou etapa de release. O comando apenas cria índices declarados; não remove índices nem altera documentos. Em bases existentes, resolva e-mails duplicados e conflitos de índices antes de aplicá-lo. A proteção de unicidade exige que o índice esteja instalado.

Novas credenciais usam AES-256-GCM com IV aleatório e formato `v2:iv:tag:ciphertext`. A leitura mantém compatibilidade com AES-CBC histórico e texto anterior. Alterar somente metadados preserva o valor armazenado. Atualizar a senha converte aquela credencial para o formato atual.

Preserve `ENCRYPTION_KEY` nas implantações e nos backups: perdê-la impede a leitura das credenciais v2. Sua troca exige uma migração específica. A criptografia é feita pelo servidor com chave da aplicação; não implementa um cofre zero knowledge nem rotação automática de chaves.

## Testes

A suíte usa `node:test` e `assert`, com testes `.cjs` que exercitam o build TypeScript real. Consulte [test/README.md](test/README.md).

```sh
npm run check
```

Sem `TEST_MONGODB_URI`, os testes que dependem do MongoDB ficam explicitamente ignorados. Para incluir MongoDB real:

```powershell
$env:TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017'
npm test
Remove-Item Env:\TEST_MONGODB_URI
```

No Linux/macOS: `TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npm test`.

A integração inicia o AppModule de produção, cria índices em um banco `minhassenhas_test_<identificador aleatório>` e remove somente esse banco ao terminar. Use uma instância de desenvolvimento com permissão para criar e excluir bancos. Ela verifica cadastro concorrente, JWT, CRUD, isolamento entre usuários, ciphertext no armazenamento e atualização de dados legados.

A CI em `.github/workflows/ci.yml` executa as verificações com MongoDB real e auditoria das dependências de produção.

## Migração de uma instalação existente

1. Faça backup do MongoDB e preserve as chaves atuais.
2. Instale o Node suportado e execute `npm ci`.
3. Atualize o ambiente usando `.env.example` como referência, sem sobrescrever `ENCRYPTION_KEY`. O antigo módulo `src/.env` foi removido.
4. Verifique e-mails duplicados e aplique `npm run db:indexes`.
5. Execute `npm run check` e o teste integrado em ambiente de desenvolvimento.
6. Execute `npm run build` e reinicie o serviço com `npm start`.

Os arquivos JavaScript antigos em `src/api`, `src/config` e `src/loader.js` foram substituídos integralmente. O frontend não precisa mudar para usar a nova API. DTOs agora rejeitam tipos inválidos antes da persistência, e a autenticação passa a aplicar limite de requisições.

## Implantação

A hospedagem deve instalar as dependências de build, executar `npm run build` e iniciar `node dist/main.js`. O Procfile já usa essa entrada. Configure supervisão externa e HTTPS. O Nest encerra HTTP, Socket.IO e Mongoose pelos shutdown hooks.

Há também Dockerfile com build em estágios separados e usuário não root:

```sh
docker build -t minhassenhas-back .
docker run --rm --env-file .env -p 3000:3000 minhassenhas-back
```

No container, `MONGODB_URI` deve apontar para um host acessível pelo container. O `.env` não é incluído na imagem. Para aplicar índices com a imagem compilada, execute uma etapa de release com `node dist/database/ensure-indexes.js` usando o mesmo ambiente do serviço.

O limite de autenticação usa memória local por processo. Ao adicionar réplicas, adote storage compartilhado ou limite no edge. Atrás de proxy, configure confiança apenas nos proxies conhecidos para identificar IPs corretamente.

O Socket.IO mantém `/api/` e compatibilidade Engine.IO 3, somente para conexão/desconexão. Não existem eventos de negócio; eventos futuros com credenciais precisam de autenticação e autorização próprias.

## Licença

ISC.
