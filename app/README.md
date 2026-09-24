# Agenda da Turma — MVP

Agenda colaborativa da turma escolar, mobile-first (PWA). Implementa `design_handoff_agenda_da_turma/ESPECIFICACAO.md` com as telas do handoff (protótipo em `design_handoff_agenda_da_turma/prototipo/`).

## Como rodar

Requer Node.js 20 ou superior. Nesta máquina ele está em `%LOCALAPPDATA%\Programs\node-v24.19.0-win-x64`, já no PATH do usuário (abra um terminal novo).

```powershell
cd app
npm install
npm run setup     # cria o banco SQLite local (prisma/dev.db), popula com a turma do protótipo e gera os ícones
npm run dev       # http://localhost:3000
```

> **Rede corporativa:** se o Prisma ou a IA falharem com `unable to get local issuer certificate`, rode antes `$env:NODE_OPTIONS="--use-system-ca"`. Assim o Node passa a confiar nos certificados do Windows.

Contas de exemplo (senha `agenda123`, todas `@agenda.dev`):

| Login | Papel |
|---|---|
| `ana@` / `maria@` | ADMIN do Jardim II - Vespertino |
| `carla@` / `juliana@` | MEMBRO |
| `paulo@` | VISUALIZADOR |
| `beatriz@` | pedido de entrada pendente |
| `roberto@` | admin de outra turma (para testar o isolamento) |

Código de convite da turma: `MAITE-2026`.

Outros comandos: `npm test` (Vitest, usa `prisma/test.db` descartável), `npm run typecheck` e `npm run build` / `npm start`.

## IA (leitura da foto)

A camada é desacoplada: a interface `AgendaAIService.extractEventsFromImage` fica em `src/server/ai/types.ts`, e o provedor é escolhido por `AI_PROVIDER`.

- `mock` (dev): resposta determinística, sem rede. Só é usado quando configurado explicitamente; em produção sem provedor, a leitura por foto fica indisponível em vez de inventar eventos. `AI_MOCK_SCENARIO` = `multi` | `single` | `relativa` | `vazio` | `erro`.
- `anthropic`: Claude com visão e saída estruturada (schema zod). Defina `ANTHROPIC_API_KEY`. Modelo em `AI_MODEL` (padrão `claude-opus-5`). O fallback no servidor (`fallbacks: "default"`) fica ligado, para o caso de um classificador recusar a leitura.

A IA só preenche a prévia. O servidor descarta valores inválidos em vez de adivinhar, como data inexistente, horário que não é horário ou valor negativo. Cada campo traz a confiança, e abaixo de 80% ele é destacado para revisão. Datas relativas precisam de confirmação explícita, e nada é cadastrado sem uma pessoa confirmar.

## Arquitetura

```
prisma/schema.prisma      schema da §37 + sessions, password_reset_tokens, uploads
src/proxy.ts              CSRF (Origin/Sec-Fetch-Site) e redirecionamento para o login
src/server/
  auth/                   bcrypt, sessão em cookie httpOnly (o banco guarda só o hash do token), rate limit
  permissions.ts          matriz ADMIN / MEMBRO / VISUALIZADOR (extensível)
  classes/                turmas, convite, aprovação, papéis, sair da turma
  events/                 CRUD, duplicidade (similaridade textual), auditoria, exclusão lógica
  ai/                     AgendaAIService + mock + Claude + normalização (nunca inventar)
  notifications/          lembretes padrão (7/3/1 dias; tarefa/prova 1 dia) e alertas no app
  storage/images.ts       fotos fora de /public, tipo validado pela assinatura do arquivo, limite de tamanho
src/app/api/…             API REST da §41 (+ check-duplicates, invite-code, leave, images)
src/app/t/[classId]/…     telas: hoje, agenda, eventos/[id], eventos/novo, editar, foto, alertas, perfil, membros, busca
```

As datas dos eventos são guardadas como dia de calendário (`YYYY-MM-DD`) e horário de parede (`HH:MM`) no fuso America/Sao_Paulo. O "hoje" é sempre calculado nesse fuso.

**Banco:** `prisma/schema.prisma` é o schema oficial, em PostgreSQL, usado em produção e nas migrações de `prisma/migrations/`. Para dev e testes, `npm run db:local` gera uma cópia SQLite em `prisma/sqlite/` (os scripts `dev`, `build` e `test` já fazem isso).

**Publicar (Vercel + Supabase):** veja [DEPLOY.md](DEPLOY.md).

## Critérios de aceitação (§54)

| Critério | Situação |
|---|---|
| Criar conta, login, entrar e sair da turma | ✅ |
| Admin aprova membros; membros veem a agenda | ✅ |
| Cadastrar, editar, excluir (lógica, com confirmação) e ver evento | ✅ |
| Eventos por dia, semana, mês; futuros fáceis de achar | ✅ Hoje, Semana, Mês, Todos, Meus e Busca |
| Detecta possível duplicado e permite "Cadastrar mesmo assim" | ✅ |
| Tirar foto, enviar à IA, dados estruturados, revisar, corrigir, confirmar antes de cadastrar | ✅ com o mock; o provedor Claude está implementado, mas não foi testado contra a API real (falta a chave) |
| IA não inventa informações ausentes | ✅ testado |
| Sem acesso a turma da qual não participa | ✅ (404) |
| Senha só com hash | ✅ bcrypt |
| Imagens protegidas | ✅ só por rota autenticada, para membros da turma |

Verificado com 40 testes automatizados e um teste de fumaça HTTP (41 checagens) contra o build de produção.

### O que falta ou ficou simplificado

- **E-mail:** não há serviço de envio. O link de recuperação de senha aparece no log do servidor.
- **Armazenamento:** disco local em dev e bucket privado do Supabase em produção (`STORAGE_DRIVER=supabase`).
- **Fora do MVP (§51/§52), com a estrutura preparada:** eventos recorrentes, anexos além da foto, push/WhatsApp/e-mail (o service worker já trata `push`), categorias personalizadas, painel da turma (§30) e as variações 1b/1c da tela Hoje (foi implementada a 1a, que é o padrão).
- O checklist "Necessário levar" é local, por usuário e por aparelho, como no protótipo.
