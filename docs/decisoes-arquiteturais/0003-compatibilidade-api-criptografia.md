# ADR 0003 — Preservar a API e explicitar a criptografia

- Data: 2026-10-11
- Status: Aceito

## Contexto

O frontend usa /oapi e /api/passwords, respostas específicas e Authorization sem
prefixo Bearer em alguns fluxos. Existem senhas em texto antigo, AES-CBC legado
e AES-256-GCM. Alterar a chave ou o formato de leitura pode inutilizar os dados.

## Decisão

Preservar métodos, caminhos, códigos de sucesso, formato `{ errors: string[] }`,
expiração JWT de um dia, HS256 e respostas públicas sem senha armazenada.
Aceitar Bearer e header direto, além das fontes body/query legadas. A identidade
do proprietário vem exclusivamente do JWT verificado e nunca do corpo recebido.

Manter bcrypt com custo 12 e limite de 72 bytes para novas senhas de autenticação.
Credenciais do cofre usam AES-256-GCM com IV aleatório de 12 bytes e formato
`v2:iv:tag:ciphertext`. CryptoService preserva a leitura AES-CBC histórica e texto
anterior, valida a estrutura v2 e rejeita adulteração sem devolver conteúdo.

PasswordsService criptografa antes da persistência; os schemas não têm hooks de
criptografia. Alterações de metadados preservam ciphertext. Alterar a senha grava
um novo ciphertext, inclusive quando o texto começa com `v2:`. Não inferir que
uma entrada do usuário já está criptografada.

## Consequências e alternativas

A chave ENCRYPTION_KEY deve ser preservada entre implantações e backups. Não há
recriptografia em massa nem rotação automática nesta mudança. Trocar AUTH_SECRET
invalida sessões; trocar ENCRYPTION_KEY sem migração impede leitura de dados v2.

A criptografia é do lado do servidor, com chave da aplicação; não é um cofre
zero knowledge. Chaves por usuário, rotação versionada e autenticação adicional
exigem novos ADRs e estratégia de recuperação/migração.

Remover fontes legadas de token é desejável em mudança coordenada com clientes,
pois tokens em query podem aparecer em logs de infraestrutura. Mantê-las agora
reduz quebras de compatibilidade. Hooks Mongoose foram rejeitados porque seu
comportamento depende do método de gravação utilizado.
