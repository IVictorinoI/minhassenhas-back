# Estratégia de testes

A suíte usa `node:test` e `node:assert/strict`, já disponíveis no Node exigido pelo projeto. Não adiciona dependências. Hash bcrypt, assinatura/verificação JWT e criptografia são executados de verdade; as operações de banco são simuladas nos testes sem MongoDB. Os mocks são restaurados automaticamente após cada teste.

## Execução

- `npm test`: executa toda a suíte; a integração é ignorada quando `TEST_MONGODB_URI` está ausente.
- `npm run test:unit`: executa unidades de autenticação, criptografia, modelos e configuração, sem MongoDB.
- `npm run test:contracts`: executa os contratos HTTP com persistência simulada, sem MongoDB.
- `npm run test:integration`: executa o cenário HTTP/MongoDB existente, quando `TEST_MONGODB_URI` estiver definida.
- `npm run test:coverage`: executa a suíte com cobertura nativa do Node para os arquivos de `src` carregados durante os testes.

Os testes HTTP abrem portas locais aleatórias e fecham os servidores ao terminar. Nenhum desses comandos inicia o loader de produção ou carrega o `.env` da aplicação. Os testes definem chaves exclusivas de teste; não dependem dos segredos do ambiente real.

Para executar também a integração em PowerShell:

```powershell
$env:TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017'
npm test
Remove-Item Env:\TEST_MONGODB_URI
```

A integração cria e remove exclusivamente um banco com nome aleatório `minhassenhas_test_*`. Use uma instância de desenvolvimento. Se a variável estiver definida e o MongoDB não estiver disponível, o teste falha; ele não ignora erros de conexão.

## Contratos protegidos

| Arquivo | Comportamentos |
| --- | --- |
| `auth.test.js` | Validações de cadastro, limite de 72 bytes incluindo Unicode, duplicatas, hash verificável, login válido/inválido, formato público, expiração e assinatura JWT, tokens inválidos/expirados/futuros, algoritmos permitidos, fontes de token, preflight e falhas de dependências |
| `crypter.test.js` | Conteúdo vazio, Unicode e conteúdo grande; aleatoriedade; adulteração de IV/tag/ciphertext; payload malformado; chave inválida/incorreta; fixture histórica e texto anterior sem criptografia |
| `models.test.js` | Campos obrigatórios, proprietário válido, URL opcional, criptografia na gravação real do documento Mongoose, troca de senha, preservação de ciphertext e senhas legadas ao editar metadados, bloqueio de gravação sem chave |
| `config.test.js` | Limite mínimo do segredo JWT, proteção de detalhes internos e delegação de erros depois do envio dos cabeçalhos |
| `password-contract.test.js` | Rotas públicas e protegidas, status e respostas, filtragem por proprietário, ordenação solicitada, senha somente na visualização, campos permitidos, atualizações parciais, exclusão, JSON inválido, erros de validação/identificador/persistência/criptografia e CORS |
| `api.test.js` | Fluxo completo de cadastro, login, JWT, CRUD, armazenamento criptografado e isolamento entre usuários com MongoDB real |

## Refatorações

Os contratos HTTP são a referência para o comportamento consumido pelo frontend. Preserve caminhos, métodos, códigos HTTP, campos de resposta e regras de autorização durante mudanças estruturais.

Os testes unitários importam os módulos atuais e os contratos sem banco simulam as operações dos modelos atuais. Se esses pontos forem movidos ou substituídos por repositórios, pode ser necessário adaptar os imports e a preparação dos mocks. Preserve as verificações de comportamento e os casos de falha; não enfraqueça uma asserção para fazer uma regressão passar. A integração com MongoDB complementa os mocks e deve ser executada antes e depois de mudanças na persistência.

Cobertura alta não comprova ausência de defeitos. O relatório nativo mede os arquivos executados: o loader de produção, a conexão real configurada em `database.js` e o ciclo de vida do Socket.IO não são exercitados pela suíte sem banco. O comando de cobertura não impõe um limite de 100% que dificultaria adicionar código nas próximas refatorações.

Mudanças intencionais de contrato exigem atualizar os testes correspondentes e verificar o impacto no frontend. Os testes protegem os comportamentos documentados; não é possível garantir que qualquer mudança futura passe sem ajustes.
