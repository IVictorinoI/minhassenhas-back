# Minhas Senhas — Backend

API para cadastro e autenticação de usuários e gerenciamento de credenciais pessoais. O frontend React consome os endpoints HTTP; o Socket.IO mantém o namespace `/api/` para conexões, sem eventos de negócio implementados.

## Requisitos

- Node.js 22 ou superior (validação realizada com Node.js 24).
- npm atualizado.
- MongoDB 7 ou superior como referência de ambiente local.

## Instalação e execução

Na pasta do backend:

```powershell
npm ci
Copy-Item .env.example .env
```

No Linux/macOS, use `cp .env.example .env`. Gere dois valores independentes:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Execute o comando duas vezes e preencha `AUTH_SECRET` e `ENCRYPTION_KEY` no arquivo `.env`. Inicie o MongoDB e execute:

```sh
npm run dev
```

A API usa `http://localhost:3000` por padrão. O arquivo `.env` da raiz é carregado no início; variáveis já definidas no ambiente têm prioridade.

| Variável | Descrição | Padrão |
| --- | --- | --- |
| `PORT` | Porta HTTP | `3000` |
| `MONGODB_URI` | URI do MongoDB | `mongodb://127.0.0.1:27017/minhassenhas` |
| `AUTH_SECRET` | Segredo de assinatura JWT, mínimo de 32 caracteres | Obrigatório |
| `ENCRYPTION_KEY` | Chave AES de 32 bytes, representada por 64 caracteres hexadecimais | Obrigatório |
| `TEST_MONGODB_URI` | URI para habilitar os testes de integração | Opcional |

Guarde a chave de criptografia junto ao procedimento de backup: perdê-la impede a leitura das novas credenciais. Não publique o `.env`.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm start` | Inicia a API |
| `npm run dev` | Inicia com reinicialização automática nativa do Node (`--watch`) |
| `npm run production` | Inicia a API diretamente, para uso com um supervisor externo |
| `npm test` | Executa os testes; integração depende de `TEST_MONGODB_URI` |
| `npm outdated` | Consulta atualizações disponíveis |
| `npm audit` | Consulta vulnerabilidades conhecidas |

O comando `production` executa em primeiro plano. Configure reinicialização automática e logs no supervisor ou serviço de hospedagem utilizado. O `Procfile` inicia a API com `node src/loader.js`.

## API

Envie JSON com `Content-Type: application/json`. As rotas protegidas aceitam `Authorization: Bearer <token>` e, por compatibilidade com o frontend existente, o token diretamente no cabeçalho `Authorization`. Tokens também são aceitos no corpo ou na query; prefira o cabeçalho para evitar exposição em URLs e logs.

| Método | Endpoint | Autenticação | Finalidade |
| --- | --- | --- | --- |
| POST | `/oapi/signup` | Pública | Cadastro e emissão de token |
| POST | `/oapi/login` | Pública | Login e emissão de token |
| POST | `/oapi/validateToken` | Pública | Validação de token |
| GET | `/api/passwords/myPasswords` | JWT | Lista credenciais do usuário por descrição |
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

Login recebe `email` e `password`. Ambos retornam `{ "name": "...", "email": "...", "token": "..." }`. O token expira em um dia e contém identificador, nome e e-mail. A senha de autenticação é armazenada como hash bcrypt. O cadastro exige nome, e-mail válido, senha não vazia de até 72 bytes e confirmação idêntica.

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

`description`, `login` e `password` são obrigatórios; `url` é opcional. O proprietário vem do JWT. A listagem e as respostas de criação/alteração/exclusão retornam `_id`, `description`, `login` e `url`; a senha é retornada apenas em `viewPassword`, no formato `{ "password": "..." }`.

Erros retornam `{ "errors": ["mensagem"] }`. Códigos principais: `400` para dados inválidos, `403` para autenticação ausente/inválida, `404` para credencial inexistente ou pertencente a outro usuário e `500` para falha interna. Criações de credenciais retornam `201`; demais operações bem-sucedidas retornam `200`.

## Estrutura

```text
src/
  loader.js           # Configuração, conexão e inicialização
  config/             # Express, MongoDB, JWT, CORS e Socket.IO
  api/
    user/             # Modelo de usuário e autenticação
    password/         # Modelo e rotas de credenciais
    common/           # Criptografia e tratamento de erros
test/                 # Testes unitários, contratos HTTP e integração HTTP/MongoDB
```

## Testes

A suíte inclui testes unitários e de contratos HTTP sem MongoDB. Consulte [test/README.md](test/README.md) para a estratégia, cobertura e orientações para refatorações. Use `npm run test:unit`, `npm run test:contracts` e `npm run test:coverage` para executar grupos específicos e medir a cobertura.

```powershell
npm test
$env:TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017'
npm test
```

No Linux/macOS: `TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npm test`.

A integração cria um banco `minhassenhas_test_<identificador aleatório>` e o remove ao terminar. Use uma instância de desenvolvimento com permissão para criar e excluir esse banco. O teste cobre cadastro/login, validação JWT, CRUD, criptografia no armazenamento e isolamento entre usuários. Sem a variável, a integração aparece como ignorada.

## Atualização de instalações existentes

1. Faça backup do MongoDB antes de atualizar e guarde as chaves usadas pela instalação.
2. Atualize o Node.js e execute `npm ci`.
3. Configure o novo `.env` na raiz. O antigo `src/.env`, um módulo JavaScript com segredo fixo, deixou de ser utilizado.
4. Configure uma nova `AUTH_SECRET` e a `ENCRYPTION_KEY`. Trocar o segredo JWT exige novo login.
5. Execute os testes e reinicie o backend.

A atualização remove `node-restful`, `mongoose-paginate`, `express-query-int` e o uso direto de `body-parser`. As rotas usam Express e Mongoose diretamente, com os mesmos caminhos consumidos pelo frontend. Não há paginação implementada. PM2 e nodemon foram removidos por vulnerabilidades transitivas nas versões disponíveis; o modo de desenvolvimento usa `node --watch` e a supervisão de produção fica a cargo da hospedagem.

Os documentos MongoDB existentes continuam nas coleções `users` e `passwords`. A leitura mantém compatibilidade com a criptografia AES-CBC antiga e com texto sem criptografia; novas gravações de senha usam AES-256-GCM com IV aleatório. Alterar apenas a descrição não recriptografa uma senha antiga. Para migrar uma credencial para o formato novo, envie novamente sua senha pela rota de atualização. Preserve a `ENCRYPTION_KEY` nas próximas implantações; sua troca exige uma migração dos dados.

## Implantação

Configure as variáveis no ambiente do serviço, use HTTPS e mantenha o MongoDB com acesso restrito. O CORS está aberto (`*`) para compatibilidade com o frontend atual; ajuste `src/config/cors.js` e a configuração do Socket.IO se precisar limitar as origens.

O Socket.IO permite o protocolo de clientes v2 (`allowEIO3`), mas o namespace atual serve apenas para conexão/desconexão. Para produção, avalie também limites de requisições e uma política de senhas adequada ao uso.

## Licença

ISC, conforme `package.json`.
