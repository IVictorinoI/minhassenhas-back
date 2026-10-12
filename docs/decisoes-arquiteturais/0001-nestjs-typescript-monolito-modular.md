# ADR 0001 — NestJS, TypeScript estrito e monólito modular

- Data: 2026-10-11
- Status: Aceito

## Contexto

A API Express em JavaScript reunia HTTP, consultas Mongoose, validações e regras
nos mesmos handlers. O projeto possui dois domínios pequenos, frontend React
independente e dados MongoDB existentes. O objetivo é facilitar evolução e testes.

## Decisão

Adotar NestJS 12 com adaptador Express, TypeScript 6, `strict` e
`noUncheckedIndexedAccess`. Usar ESM nativo e decorators com metadata emitida pelo
TypeScript. A versão exata de cada dependência está no package.json e lockfile.

Organizar um monólito modular: auth, users, passwords, crypto e realtime.
Controllers tratam HTTP; DTOs validam entrada; services executam regras;
repositories encapsulam Mongoose. Dependências são fornecidas pelo container Nest.
O ApiModule reúne a superfície HTTP e pode ser inicializado sem banco real nos
testes. O AppModule compõe configuração, banco, HTTP e gateway em produção.

Não adicionar microsserviços, CQRS ou camadas genéricas sem uma necessidade
concreta. Interfaces/ports adicionais devem surgir quando houver múltiplas
implementações ou isolamento de domínio que justifique sua manutenção.

## Alternativas

- Express + TypeScript: migração menor, mas depende de convenções locais.
- Fastify + TypeScript: enxuto, porém menos prescritivo sobre organização.
- AdonisJS: integrado, com persistência oficial orientada a SQL.
- Next.js: não atende ao escopo confirmado; o frontend permanece independente.

## Consequências e revisão

Há mais arquivos e conceitos, em troca de limites claros e DI. O servidor mantém
Express para reduzir mudanças simultâneas. Avaliar Fastify apenas com medições de
gargalo HTTP. Avaliar separação de serviços quando houver requisitos independentes
de escala, implantação ou propriedade por equipes.

## Referências

- https://docs.nestjs.com/modules
- https://docs.nestjs.com/providers
- https://docs.nestjs.com/techniques/mongodb
