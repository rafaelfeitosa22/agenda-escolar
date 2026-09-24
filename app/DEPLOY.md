# Publicar: Vercel + Supabase

Arquitetura em produção:

- **Vercel** (região São Paulo, `gru1`): roda o app Next.js e aplica as migrações do banco a cada deploy.
- **Supabase** (região São Paulo, `sa-east-1`): banco **PostgreSQL** e **Storage**, com as fotos num bucket privado.

Nada disso exige permissão de administrador na sua máquina: tudo é feito pelo navegador e pelo Git.

---

## 1. Supabase: banco e armazenamento

1. Crie uma conta em https://supabase.com e clique em **New project**.
   - **Name:** `agenda-da-turma`
   - **Database password:** gere uma senha forte e **guarde-a**. Ela é usada nas URLs abaixo.
   - **Region:** `South America (São Paulo)`
2. Com o projeto criado, clique em **Connect** (no topo) › **ORMs** › **Prisma**, ou copie de **Connection string** as duas URLs:
   - **Transaction pooler** (porta **6543**) → vira `DATABASE_URL`. Acrescente no fim: `?pgbouncer=true&connection_limit=1`
   - **Session pooler** (porta **5432**, host `…pooler.supabase.com`) → vira `DIRECT_URL`

   > Não use a "Direct connection" (`db.<projeto>.supabase.co`): no plano gratuito ela só funciona por IPv6, e a Vercel não consegue se conectar.

   Troque `[YOUR-PASSWORD]` pela senha do passo 1 nas duas URLs.
3. Em **Project Settings › API**, copie:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY`. Essa chave dá acesso total ao projeto: ela vai só nas variáveis da Vercel, nunca no código ou no Git.

O bucket privado `agenda-fotos` é criado automaticamente no primeiro envio de foto. As tabelas são criadas pela migração no deploy, com RLS ligado em todas elas, o que bloqueia a API pública do Supabase.

## 2. GitHub: repositório privado

1. Em https://github.com/new crie um repositório **privado**, por exemplo `agenda-da-turma`. **Não** marque "Add a README".
2. No terminal, dentro de `agendaescola/`:
   ```powershell
   git remote add origin https://github.com/SEU-USUARIO/agenda-da-turma.git
   git push -u origin main
   ```
   Na primeira vez, o Git abre o navegador para você autorizar o acesso à sua conta.

## 3. Vercel: o app

1. Crie uma conta em https://vercel.com (pode entrar com o GitHub).
2. **Add New… › Project** › importe o repositório `agenda-da-turma`.
3. Em **Root Directory**, escolha **`app`**. O resto é detectado pelo `vercel.json`.
4. Em **Environment Variables**, cadastre:

   | Nome | Valor |
   |---|---|
   | `DATABASE_URL` | Transaction pooler (6543) + `?pgbouncer=true&connection_limit=1` |
   | `DIRECT_URL` | Session pooler (5432) |
   | `STORAGE_DRIVER` | `supabase` |
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave service_role |
   | `SUPABASE_BUCKET` | `agenda-fotos` |
   | `MAX_UPLOAD_MB` | `4` (a Vercel aceita até 4,5 MB por requisição; o app já reduz a foto no celular) |
   | `AI_PROVIDER` | `anthropic` |
   | `ANTHROPIC_API_KEY` | sua chave de https://console.anthropic.com |
   | `AI_MODEL` | `claude-opus-5` |
   | `APP_URL` | a URL do app na Vercel, ex.: `https://agendaceneb.vercel.app` |
   | `CLASS_CREATOR_EMAILS` | e-mail(s) de quem pode criar turmas, separados por vírgula |

   Sem `ANTHROPIC_API_KEY`, o app funciona normalmente, mas o "Cadastrar pela foto" mostra que a leitura está indisponível. Em produção ele **nunca** usa o modo de exemplo, que inventaria eventos.
5. Clique em **Deploy**. O build roda `prisma generate`, depois `prisma migrate deploy`, que cria as tabelas no Supabase, e por fim `next build`.

## 4. Primeiro acesso

O banco de produção começa **vazio**. O seed de exemplo só roda no SQLite local e se recusa a rodar em outro banco.

1. Abra a URL da Vercel e clique em **Criar conta**.
2. Entre com um e-mail listado em `CLASS_CREATOR_EMAILS` (só ele vê **Administrar uma turma**) e crie a turma (ex.: *Jardim II - Vespertino*, *Escola CENEB Kids Águas Claras*). Você vira administrador(a).
3. Em **Membros**, compartilhe o **código de convite** com as famílias e aprove os pedidos de entrada.

Com HTTPS, funcionam também o botão "Compartilhar" (menu nativo do celular), "Adicionar à tela inicial" (PWA) e o modo offline.

---

## Atualizações

- **Código:** faça commit e `git push`. A Vercel publica sozinha.
- **Banco:** altere `prisma/schema.prisma` e rode `npm run db:migration -- nome_da_mudanca`. Isso cria a migração em `prisma/migrations/`. Se a mudança criar uma tabela nova, acrescente `ALTER TABLE "nome" ENABLE ROW LEVEL SECURITY;` no fim do `migration.sql`. Faça commit, e o próximo deploy aplica a migração.
- **Local:** continua em SQLite (`npm run dev`), gerado a partir do mesmo schema. Nunca aponte o `.env` local para o banco de produção.

## Limitações conhecidas

- **E-mail:** sem serviço de envio, o link de "Esqueci minha senha" aparece só nos logs da Vercel (Project › Logs). Para enviar e-mails, dá para integrar Resend ou SMTP depois.
- **Backups:** o plano gratuito do Supabase não tem backup diário com restauração. Para dados reais das famílias, considere o plano Pro.
- **Plano gratuito do Supabase:** o projeto é pausado após 7 dias sem uso e volta no painel.
