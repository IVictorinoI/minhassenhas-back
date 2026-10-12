# ADR 0002 — MongoDB/Mongoose, repositórios e índices explícitos

- Data: 2026-10-11
- Status: Aceito

## Contexto

As coleções users e passwords já contêm documentos utilizados pelo frontend.
Não existe necessidade funcional de trocar o banco. A consulta prévia de e-mail
não impede duas requisições concorrentes de cadastrar o mesmo endereço.

## Decisão

Manter MongoDB e Mongoose, com schemas TypeScript e nomes de coleção explícitos.
UsersRepository e PasswordsRepository concentram consultas e gravações.
Todas as operações de credencial incluem o proprietário no filtro MongoDB;
documento de outro usuário produz o mesmo 404 de um documento inexistente.

Declarar índice único `users_email_unique` sobre email e índice
`passwords_user_description` sobre user/description. Manter `autoIndex: false`.
Aplicar os índices com `npm run db:indexes`, que usa createIndexes, não syncIndexes:
não elimina índices existentes nem reescreve documentos. A duplicidade E11000 no
cadastro é traduzida para o erro público já existente.

## Implantação e consequências

Antes de criar o índice único em base existente, verificar e resolver duplicatas
com revisão dos dados. O comando pode falhar em bases com duplicatas ou conflito
de opções/nome de índice; não tenta corrigir nem apagar registros automaticamente.
A proteção concorrente depende de o índice estar aplicado no ambiente.

Manter a comparação de e-mail atual, sensível a maiúsculas, nesta migração.
Normalização exige decisão e migração de dados específicas. Senhas são
criptografadas no service antes de chegar ao repository. Escritas diretas pelos
models ficam restritas a manutenção controlada e testes.

## Alternativas e revisão

SQL/Prisma ou outro ODM ampliariam o risco sem ganho funcional demonstrado.
Índices automáticos no startup tornariam a implantação imprevisível em bases
grandes. Avaliar paginação e projeções quando o volume real justificar a mudança
de contrato; avaliar transações ao introduzir operações sobre múltiplos documentos.
