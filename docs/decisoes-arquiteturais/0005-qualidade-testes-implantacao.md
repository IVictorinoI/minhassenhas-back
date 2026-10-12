# ADR 0005 — Build ESM, testes e implantação

- Data: 2026-10-11
- Status: Aceito

## Decisão e contexto

Compilar src TypeScript para dist ESM usando tsc/NodeNext e metadata dos
decorators. Executar `node dist/main.js` em produção. Node 24 LTS é a referência;
package.json define as versões mínimas compatíveis. Não executar TypeScript
diretamente no Node porque a remoção nativa de tipos não emite metadata Nest.

Usar o watcher nativo do Node em desenvolvimento; cada alteração em src recompila
com tsc antes de iniciar. Não depende de processos adicionais de bundler.
Ativar shutdown hooks para encerrar HTTP, Socket.IO e conexão Mongoose.

Preservar node:test e assert. Os testes ficam em .cjs para manter mocks nativos
das bibliotecas CommonJS existentes, e exercitam o build TypeScript real. Isso
não mantém uma segunda implementação do backend. O helper de testes adapta
somente a chamada dos antigos testes unitários para DTO/pipe/service/guard Nest.
Contratos HTTP sobem uma aplicação Nest real com models substituídos por providers
de teste. A integração usa o AppModule de produção e MongoDB real, com banco
aleatório exclusivo, removido ao terminar. Nunca limpar o banco da aplicação.

Acrescentar contratos de DTO, rate limiting, Swagger, headers, CORS, gateway,
concorrência do índice único e compatibilidade dos formatos criptográficos.
ESLint com análise de tipos, Prettier, build e testes fazem parte de `npm run check`.
CI inicia MongoDB e inclui a integração. O Dockerfile faz build em estágio separado
e executa com usuário não root e dependências de produção.

## Alternativas e consequências

Jest e Nest CLI não são necessários para a aplicação atual; tsc e node:test
reduzem ferramentas sobrepostas. Os mocks atuais de models permanecem úteis para
testar filtros e falhas; integração real verifica comportamento do Mongoose.
Cobertura não é garantia de correção e não exige 100% artificialmente.

Não há deploy automático: CI valida o código; a hospedagem deve instalar,
compilar, aplicar índices na etapa de release e iniciar o build. Rollback exige
manter chaves, backup e versão anterior do artefato. Índices adicionados não
reescrevem documentos e continuam compatíveis com o backend anterior.
