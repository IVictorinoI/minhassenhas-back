# Estratégia de testes

A suíte usa node:test e assert/strict. Os testes CommonJS (.cjs) executam os módulos do build ESM emitido de src TypeScript. Não existe implementação JavaScript paralela da aplicação.

## Execução

- `npm test`: compila e executa todos os testes.
- `npm run test:unit`: autenticação, configuração, criptografia e schemas.
- `npm run test:contracts`: HTTP, DTOs, guards, rate limiting, Swagger, headers, CORS e Socket.IO.
- `npm run test:integration`: AppModule de produção com MongoDB real.
- `npm run test:coverage`: cobertura dos arquivos dist executados, com source maps disponíveis.
- `npm run check`: tipos, lint, formatação, build e suíte.

Sem TEST_MONGODB_URI, a integração é ignorada explicitamente. Com a variável definida, erros de conexão falham o teste.

```powershell
$env:TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017'
npm test
Remove-Item Env:\TEST_MONGODB_URI
```

## Camadas verificadas

| Arquivo | Comportamentos |
| --- | --- |
| auth.test.cjs | DTO/ValidationPipe, AuthService e AuthGuard; bcrypt/JWT reais; validações, falhas, expiração, assinatura e fontes de token |
| crypter.test.cjs | CryptoService: Unicode, vazio, IV aleatório, adulteração, chave inválida e fixtures históricas |
| models.test.cjs | Schemas reais e gravação via service/repository; ciphertext antes da escrita, atualizações parciais e preservação de dados legados |
| config.test.cjs | Ambiente, encerramento de resposta e ausência de detalhes sensíveis em erro/log |
| password-contract.test.cjs | HTTP Nest real com models injetados e operações simuladas; contratos e isolamento por proprietário |
| nest-contract.test.cjs | Entrada inválida antes de persistir, identidade JWT, 429, OpenAPI, documentação desabilitada, headers, CORS, gateway e E11000 |
| api.test.cjs | AppModule real, conexão e índices MongoDB, cadastro concorrente, CRUD, autorização e migração de senhas legadas |
| bootstrap.test.cjs | Entrada compilada de produção e encerramento sem pendurar o processo quando a porta está ocupada |

helpers/application.cjs constrói uma aplicação Nest real com providers Mongoose de teste e a mesma configuração HTTP da produção. Nos testes unitários herdados, pequenos adaptadores exclusivos de teste convertem a chamada anterior para os DTOs, services e guard atuais. Os contratos HTTP chamam os controllers reais pela rede, sem esses adaptadores.

Os testes HTTP usam portas aleatórias e fecham a aplicação Nest após cada caso. As chaves são exclusivas de teste. A integração cria um banco minhassenhas_test_<identificador aleatório>, aplica os índices e remove exclusivamente esse banco ao terminar. Use MongoDB de desenvolvimento. Não aponte testes para dados de produção.

## Refatorações

Preserve as asserções de comportamento: caminhos, status, respostas, segredo somente na visualização e filtro por proprietário. Mocks de models verificam consultas e falhas, mas não substituem a integração real. Mudanças nos repositórios podem exigir adaptação dos mocks, sem enfraquecer as expectativas.

A migração altera intencionalmente os pontos internos testados: a criptografia sai do hook Mongoose e passa para o service; portanto, a verificação de escrita usa service/repository e inspeciona o documento recebido pela coleção. DTOs rejeitam tipos inválidos antes de consultar o banco. Testes de falha de persistência enviam entradas válidas para atingir essa camada.

Cobertura não comprova ausência de defeitos. A suíte não garante recuperação de infraestrutura, comportamento de proxies externos ou disponibilidade de serviços de hospedagem. CI executa integração com MongoDB; implantação precisa também de validação operacional do ambiente.
