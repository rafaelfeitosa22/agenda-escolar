# Handoff: Agenda da Turma — telas principais (MVP)

## Visão geral
Agenda colaborativa da turma escolar, mobile-first. Pais/responsáveis veem num só lugar os compromissos registrados pela professora na agenda física (passeios, tarefas, provas, festas, materiais, pagamentos). Este pacote cobre as telas **Hoje (3 variações)**, **Agenda (Semana / Mês / Todos / Meus)** e **Detalhe do evento**, com exclusão, compartilhamento e visualização da foto original.

## Sobre os arquivos de design
Os arquivos em `prototipo/` são **referências de design em HTML**: protótipos que mostram aparência e comportamento, **não código de produção**. A tarefa é **recriar essas telas no ambiente do projeto** (se ainda não houver, escolher a stack mais adequada — ex.: Next.js/React + PWA) usando seus padrões. Para ver: abra `prototipo/Agenda da Turma.dc.html` num navegador via servidor local (ex.: `npx serve prototipo`). A lógica e os dados de exemplo estão no `<script>` da classe `Component` no fim do arquivo.

## Fidelidade
**Alta fidelidade.** Cores, tipografia, espaçamentos, bordas e textos são finais. Recriar fielmente.

## Sistema visual (Modernist)
- Plano, arquitetural, **raio 0 em tudo** (nada arredondado, exceto a moldura do celular que é só apresentação).
- Divisórias fortes de **2px**: `--color-divider` entre itens; `--color-text` (tinta sólida) sob títulos de seção.
- Tudo alinhado à esquerda, **inclusive rótulos de botão** (texto no início, ícone de seta no fim).
- Vermelho só para ação principal, "hoje" e pequenos destaques. O resto é tinta sobre fundo claro.
- Fonte única: **Archivo** (400 / 600 / 800).
- Categorias usam **emoji** (conforme briefing). Ícones de interface: **Lucide**, traço 2–2.4px, `stroke-linecap: square`.
- Fotos em preto e branco (`filter: grayscale(1) contrast(1.08)`).

### Tokens
| Token | Valor |
|---|---|
| `--color-bg` | #f3f2f2 (fundo) |
| `--color-surface` | #eae9e9 (blocos de emoji, hover) |
| `--color-text` | #201e1d |
| `--color-accent` | #ec3013 (botão primário, FAB, pôster) |
| `--color-accent-100` | #fff2ef (fundo de tags de alerta) |
| `--color-accent-600` | #dd2b0f (hover do primário) |
| `--color-accent-700` | #ae1800 (texto vermelho, pressed, "Excluir") |
| `--color-accent-800` | #7c1405 (texto de tag) |
| `--color-neutral-200/300/500/600/700/800/900` | #eae7e7 / #d7d3d3 / #9b9797 / #7d7979 / #605d5d / #444141 / #2d2b2b |
| `--color-divider` | #201e1d a 40% |
| `--shadow-md` | 0 3px 10px rgba(45,43,43,.16) |
| `--shadow-lg` | 0 12px 32px rgba(45,43,43,.22) |
| Espaçamento | 4, 8, 12, 16, 24, 32px; margem lateral das telas = 20px |

Todos os tokens estão em `prototipo/_ds/.../styles.css`.

### Tipografia usada
- Saudação/título de tela: 30px / 800 / lh 1.1 / ls −0.015em
- Título de evento (card de hoje, detalhe): 18px ou 30px / 800
- Título de linha de lista: 16px / 600
- Rótulo de seção: 13px / 800 / maiúsculas / ls .08em
- Kicker (tipo do evento): 12–13px / 600 / maiúsculas / ls .06em / `--color-accent-700`
- Metadados: 13–14px / 400 / `--color-neutral-700`
- Data grande em listas: 26–30px / 800 + mês 12px / 600
- Mínimo de 12px em qualquer texto; alvos de toque ≥ 44px.

## Estrutura do app (moldura 390×844)
1. **Status bar** 48px.
2. **Cabeçalho da turma** (em Hoje e Agenda): ícone quadrado 40px vermelho com 🌻, nome da turma "Jardim II - Vespertino" (15/800), escola "Escola CENEB Kids Águas Claras" (12, neutral-700), avatar quadrado 36px (tinta, inicial "A"), botão menu 36px. Borda inferior 2px divider.
3. **Conteúdo rolável.** Ao trocar de tela, volta ao topo.
4. **Barra inferior** 84px, borda superior 2px tinta, 5 colunas: Hoje, Agenda, **+** (quadrado 52px vermelho), Alertas, Perfil. Ativo = `--color-accent-700`; inativo = neutral-700. Rótulos 12/600.

## Telas

### 1. Hoje — 1a "Lista" (padrão)
- "Olá, Ana 👋" + "Quarta-feira, 23 de setembro".
- Seção **HOJE** (rótulo à esq., "2 compromissos" / "Livre" à dir., borda inferior 2px tinta).
- Card de hoje: grid `48px 1fr`, gap 14, padding 16/20. Emoji num quadrado 48 (surface, 24px). Kicker "ATIVIDADE · HOJE" / "TAREFA · ENTREGA HOJE" / "… · ÀS 15:00". Título 18/800. Resumo: "Levar: Lápis de cor, Cola, Tesoura sem ponta" se houver materiais, senão a descrição.
- Estado vazio: "🎉 Nenhum compromisso para hoje!" (17/600).
- Atalho **📷 Cadastrar pela foto**: bloco vermelho com margem de 20px, "Fotografe a agenda. Você confere e confirma." e seta.
- Seção **PRÓXIMOS EVENTOS** + "Ver todos" (vai para Agenda › Todos). Até 5 linhas: grid `52px 1fr 20px` com dia grande e mês, "emoji + título", linha de apoio "Em 2 dias · R$ 35,00 · autorização · material" e chevron. A linha de apoio fica em accent-700 quando faltam ≤ 7 dias; senão neutral-700.

### 1b "Pôster"
- Bloco vermelho no topo com a **próxima pendência** (primeiro evento futuro, ativo, com pagamento, autorização ou material): kicker "PRÓXIMA PENDÊNCIA · 30/09", contagem "7 dias" em 64/800, título 22/800 e "Não esquecer: …" acima de uma linha de 2px.
- "Hoje" em lista compacta, depois "Próximos" (coluna "QUA 30/09" de 72px) e botão com contorno "📷 Cadastrar pela foto".

### 1c "Grade"
- Grid 2×2 com linhas de 2px em tinta: HOJE (célula vermelha), ESTA SEMANA, PAGAMENTOS (soma em R$), COM MATERIAL. Número 44/800. Cada célula leva à Agenda (Semana ou Todos).
- Hoje em blocos surface, "Linha do tempo" (linha vertical de 2px com marcadores quadrados de 12px: vermelho se há pendência, tinta se não, cinza se cancelado) e botão vermelho da foto.

> A escolha entre 1a/1b/1c é decisão de produto. O seletor acima do celular existe só no protótipo. Implementar a variação escolhida (padrão: 1a).

### 2. Agenda
- Título "Agenda" (30/800) + controle segmentado de 4 opções (Semana | Mês | Todos | Meus), borda 2px tinta, altura 44. Selecionado = fundo tinta com texto claro.
- **Semana:** 7 dias a partir de hoje. Linha `72px 1fr`: dia da semana (12/600), número (28/800) e "HOJE" em accent-700 no dia atual. À direita, os eventos (título 16/600 e "horário · local") ou "Nenhum evento".
- **Mês:** "SETEMBRO 2026" com botões ‹ › de 44px e borda 2px; cabeçalho SEG…DOM (começa na segunda); grid de 7 colunas com gap de 2px sobre divider e células de 52px (número acima, até 3 emojis abaixo, "✕" para cancelado). Hoje = número em accent-700 / 800. Dia selecionado = fundo tinta. Abaixo aparece o dia selecionado por extenso e seus eventos, ou "Nenhum evento neste dia."
- **Todos (próximos):** eventos a partir de hoje agrupados por data, com borda superior 2px tinta em cada grupo. Coluna de 72px: dia 30/800 + "OUT · QUI". Relativo ("EM 15 DIAS"), título 17/800 e tags (💰 R$ 35,00 · 📄 Autorização · 🎒 Material · ⏰ 08:00) com fundo accent-100 e texto accent-800 em 12/600. Cancelado: título riscado e tag "❌ Cancelado" em fundo tinta.
- **Meus:** mesmo layout, só eventos do usuário. Vazio: "Você ainda não cadastrou eventos."

### 3. Detalhe do evento
- Barra: "‹ Voltar" (44px) e ícone de compartilhar. O cabeçalho da turma some.
- Kicker "🚌 PASSEIO", título 30/800. Se cancelado: título riscado e selo "❌ CANCELADO" (fundo tinta).
- Grid 2×2 de fatos com linhas de 2px: 📅 Data ("08/10/2026" + "Quinta-feira · em 15 dias"), ⏰ Horário, 📍 Local, 💰 Valor. Valor 18/800. Quando falta dado: "Não informado" em neutral-600 (nunca inventar).
- Tags de alerta: 💰 Pagamento necessário, 📄 Autorização necessária, 🎒 Material necessário.
- **Descrição.**
- **Necessário levar:** checklist com caixas quadradas de 24px e borda 2px. Marcado = fundo tinta, ✓ e texto riscado. Legenda "Marque o que já separou. Só você vê." (estado local de cada usuário).
- **Observações** (se houver).
- **Origem: foto da agenda**, só quando `source = foto`: botão com contorno 2px, miniatura 52px e "Ver foto original". Abre a tela cheia escura com a foto, a data e "Texto lido na foto".
- Rodapé: "Cadastrado por", "Cadastrado em" e a última entrada do histórico (ex.: "Maria alterou o horário em 23/09/2026 às 19:32.").
- Ações: **Compartilhar com a família** (primário vermelho, 52px), **Editar** (contorno tinta) e **Excluir** (contorno e texto accent-700).

## Interações
- Tocar em qualquer evento abre o Detalhe. "Voltar" retorna à aba anterior.
- **Excluir:** diálogo "Tem certeza que deseja excluir este evento?" + "“{título}” deixará de aparecer para toda a turma." com [Cancelar] [Excluir]. Ao confirmar, faz exclusão lógica, volta e mostra o toast "Evento excluído.".
- **Compartilhar:** usa `navigator.share({ text })`. Se não houver suporte, copia para a área de transferência e mostra o toast "Texto copiado. Cole no WhatsApp.". Formato do texto:
  ```
  🚌 Passeio ao Zoológico

  📅 08/10
  ⏰ 08:00
  💰 R$ 35,00

  Não esquecer: Autorização assinada.
  ```
- **+ (FAB):** bottom sheet "Adicionar evento" com [📷 Cadastrar pela foto] (primário) e [✏️ Preencher manualmente]. Toque no fundo fecha.
- Toast: faixa tinta, 16px acima da barra inferior, some após 2,2s.
- Hover: fundo surface nas linhas; primário passa para accent-600 (hover) e accent-700 (pressed). Foco: outline 2px accent, offset 2px.
- Datas relativas: Hoje / Amanhã / Ontem / "Em N dias" / "Há N dias". Fuso **America/Sao_Paulo**.

## Estado (referência)
`tab` (hoje|agenda), `view` (semana|mes|todos|meus), `detailId`, `monthOffset`, `selectedDay`, `checkedMaterials` (local por usuário), overlays (sheet de adicionar, confirmação de exclusão, foto original), `toast`. Dados vêm de `GET /classes/{id}/events`, e o detalhe de `GET /events/{id}`.

Modelo de evento usado no protótipo: `id, emoji/type, title, date, time?, place?, amount?, auth?, desc, materials[], obs?, status (ativo|concluido|cancelado), createdBy, createdAt, source (foto|manual), originalImageUrl, history[]`.

## Assets
- Nenhuma imagem real. A foto da agenda é um placeholder listrado, a ser substituído pela imagem protegida (URL assinada) do evento.
- Ícones Lucide: house, calendar, plus, bell, user, menu, share-2, chevron-left/right, arrow-right.
- Emoji por categoria: 📚 Tarefa, 📝 Prova, 🚌 Passeio, 🎉 Festa, 🎨 Atividade, 🎒 Material, 🏫 Evento escolar, 👩‍🏫 Reunião, 💰 Pagamento, 📢 Informativo, 🎂 Aniversário, 🗓️ Outros.

## Arquivos
- `prototipo/Agenda da Turma.dc.html`: protótipo completo (marcação + lógica + dados de exemplo).
- `prototipo/support.js`: runtime necessário só para abrir o protótipo.
- `prototipo/_ds/.../styles.css`: tokens do sistema visual.
- `PROMPT_CLAUDE_CODE.md`: prompt sugerido para iniciar a implementação.
