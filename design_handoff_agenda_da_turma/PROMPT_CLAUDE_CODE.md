Você vai construir o MVP da **Agenda da Turma**, uma aplicação web mobile-first (PWA) em que pais e responsáveis de uma turma escolar compartilham os compromissos registrados na agenda física da criança.

## Material anexo
1. `ESPECIFICACAO.md`: especificação funcional completa (regras, permissões, banco, API, segurança, IA, critérios de aceitação). É a fonte da verdade para **comportamento**.
2. `design_handoff_agenda_da_turma/`: handoff de design. Leia primeiro o `README.md`. O protótipo HTML em `prototipo/` é a fonte da verdade para **aparência**. Ele é referência, não código para copiar: recrie as telas na stack escolhida.

## Stack (salvo se já houver um projeto neste repositório)
- Next.js (App Router) + TypeScript + Tailwind, configurado com os tokens do README (raio 0, Archivo, paleta Modernist).
- PostgreSQL + Prisma, com o schema da seção 37 da especificação (inclui `schools`, `classes`, `class_members`, `event_history`, exclusão lógica).
- Autenticação por e-mail e senha com hash (argon2 ou bcrypt), sessão em cookie httpOnly, rate limiting no login e CSRF.
- Upload de imagens em storage privado (S3 compatível ou disco local em dev), servido só por URL assinada ou rota autenticada.
- Camada de IA desacoplada: interface `AgendaAIService.extractEventsFromImage(image)`, que retorna JSON com campos e confiança por campo, com provedor escolhido por variável de ambiente e um **modo mock** para desenvolvimento.
- PWA: manifest, ícone e service worker com cache básico.
- Fuso America/Sao_Paulo em todo o app.

## Como trabalhar
1. Leia a especificação e o README do handoff. Proponha em poucas linhas a arquitetura de pastas e o schema antes de codar.
2. Implemente por etapas, validando cada uma:
   a. Schema, migrações e seed com a turma "Jardim II - Vespertino" (Escola CENEB Kids Águas Claras) e os eventos de exemplo do protótipo.
   b. Autenticação, entrada na turma por código de convite, aprovação pelo admin e permissões ADMIN / MEMBRO / VISUALIZADOR checadas no backend.
   c. API REST de eventos (seção 41), com validação (zod), auditoria em `event_history` e exclusão lógica.
   d. Telas do handoff, **pixel-fiéis ao protótipo**: Hoje (variação 1a "Lista"), Agenda (Semana / Mês / Todos / Meus), Detalhe do evento (checklist local, foto original, compartilhar, excluir com confirmação), barra inferior e sheet do "+".
   e. Cadastro manual e edição, com poucos campos por tela, obrigatórios primeiro.
   f. Detecção de duplicidade (mesma turma, mesma data, título semelhante por similaridade textual) com aviso "⚠️ Parece que este evento já foi cadastrado." e as opções [Ver evento] / [Cadastrar mesmo assim]. Nunca bloquear em definitivo.
   g. Cadastro pela foto: câmera, IA, prévia para revisão com campos de baixa confiança destacados, confirmação de datas relativas ("A IA interpretou 'próxima quarta-feira' como 30/09/2026. Está correto?"), vários eventos por foto com seleção, erro com [Tentar novamente] / [Preencher manualmente]. **A IA nunca cadastra sozinha e nunca inventa campos.**
   h. Aviso para evento no passado e PWA.
3. As telas de foto/IA, cadastro manual, alertas e perfil **não têm design no handoff**. Crie-as seguindo o mesmo sistema visual (raio 0, divisórias de 2px, alinhamento à esquerda, vermelho só na ação principal, botões ≥ 44px, textos ≥ 12px) e as regras da especificação.
4. Escreva testes para permissões por turma, duplicidade, extração mock da IA e auditoria.
5. Ao final, confira cada item dos critérios de aceitação (seção 54) e informe o que falta.

Tire dúvidas comigo antes de decisões grandes que a especificação não cubra.
