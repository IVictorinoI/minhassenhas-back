# ADR 0004 — Validação, configuração e segurança nas fronteiras

- Data: 2026-10-11
- Status: Aceito

## Contexto

Tipos TypeScript não validam JSON recebido. A API manipula credenciais sensíveis
e precisa controlar a exposição de dados e configuração inválida.

## Decisão

Usar DTOs class-validator/class-transformer com ValidationPipe global, whitelist,
sem conversão implícita de tipos. Campos extras continuam sendo ignorados para
compatibilidade. Dados inválidos, incluindo objetos no lugar de strings e null
em campos de atualização, são rejeitados antes de persistir. PUT continua parcial.
Validar identificadores antes das consultas. AuthGuard verifica HS256, expiração
e presença de identidade; CurrentUser evita uso direto do request nas regras.

Validar configurações no startup com ConfigModule: segredos, chave, ambiente,
porta, URI MongoDB, origens, Swagger e limites. Não imprimir segredos. O filtro
global mantém erros públicos e não registra exceções brutas de banco/criptografia.
O adaptador Express normaliza erros de parsing antes da conversão do framework.

Ativar cabeçalhos de segurança nativos do Nest 12.1 e Cache-Control: no-store.
Limitar autenticação por IP/rota com ThrottlerGuard; padrão 20 requisições/minuto.
Usar uma configuração CORS para HTTP e Socket.IO. Manter `*` por compatibilidade
local; produção deve configurar as origens concretas do frontend.

Gerar OpenAPI via decorators/DTOs, disponível em /docs e /docs-json quando
SWAGGER_ENABLED=true. Desabilitar por padrão em produção. Swagger não persiste
autorização no navegador.

## Consequências e revisão

A validação mais estrita altera o resultado de entradas inválidas antes aceitas
por coerção do Mongoose. Não altera os fluxos válidos do frontend.
Rate limiting acrescenta respostas 429 intencionais. O storage é em memória,
por processo. Múltiplas réplicas exigem storage compartilhado ou controle no edge.
Atrás de proxy, definir trust proxy somente para proxies conhecidos antes de
depender do IP encaminhado; não confiar indiscriminadamente em X-Forwarded-For.
Socket.IO mantém apenas conexão/desconexão, sem eventos de negócio. Qualquer
evento futuro com dados requer autenticação e autorização próprias.

## Referências

- https://docs.nestjs.com/techniques/validation
- https://docs.nestjs.com/techniques/configuration
- https://docs.nestjs.com/security/helmet
- https://docs.nestjs.com/security/rate-limiting
