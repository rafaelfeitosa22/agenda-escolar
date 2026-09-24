# PROJETO: AGENDA INTELIGENTE DA TURMA

## 1. Objetivo do projeto

Criar uma aplicação web responsiva, com foco em uso mobile, chamada provisoriamente de **Agenda da Turma**.

O objetivo é resolver um problema comum dos pais e responsáveis:

A professora registra diariamente na agenda física da criança informações como:

* Passeios;
* Festas;
* Trabalhos;
* Tarefas;
* Datas comemorativas;
* Materiais que precisam ser levados;
* Reuniões;
* Eventos escolares;
* Informativos;
* Dias em que a criança precisa levar algum objeto;
* Prazos;
* Atividades especiais.

O problema é que a professora pode registrar hoje uma atividade que acontecerá daqui a 5, 10, 15 ou mais dias.

Atualmente, os responsáveis precisam consultar a agenda física diariamente e lembrar de procurar registros antigos.

A aplicação deverá transformar essas informações em uma **agenda/calendário digital compartilhado da turma**, permitindo que qualquer mãe/pai/responsável autorizado cadastre eventos e que todos possam visualizar facilmente os compromissos futuros.

---

# 2. Conceito principal

A aplicação deverá funcionar como uma agenda colaborativa da turma.

Exemplo:

Hoje é 23/09.

A professora escreveu na agenda:

> "Dia 08/10 teremos passeio ao zoológico. Enviar autorização assinada e R$ 35,00."

Uma mãe tira uma foto dessa anotação.

A aplicação utiliza IA/OCR para interpretar a imagem e sugerir:

**Evento:** Passeio ao zoológico
**Data:** 08/10/2026
**Tipo:** Passeio
**Descrição:** Passeio ao zoológico
**Valor:** R$ 35,00
**Observação:** Enviar autorização assinada

A mãe apenas confirma e o evento passa a fazer parte da agenda compartilhada da turma.

---

# 3. Público

A aplicação será utilizada inicialmente por:

* Mães;
* Pais;
* Responsáveis;
* Eventualmente professores/coordenadores.

O primeiro cenário será uma única turma escolar.

Porém, a arquitetura deve permitir futuramente que existam:

* várias escolas;
* várias turmas;
* vários administradores;
* usuários participando de mais de uma turma.

---

# 4. Acesso e autenticação

Criar sistema de autenticação.

Cada usuário deverá possuir:

* Nome;
* E-mail;
* Senha;
* Foto opcional;
* Data de cadastro;
* Status ativo/inativo.

Funcionalidades:

* Criar conta;
* Login;
* Logout;
* Recuperação de senha;
* Alteração de senha;
* Editar perfil.

Após o login, o usuário deverá visualizar as turmas das quais participa.

---

# 5. Entrada na turma

Criar mecanismo para uma pessoa entrar em uma turma.

Inicialmente utilizar um **código de convite da turma**.

Exemplo:

Código:

`MAITE-2026`

O administrador da turma poderá gerar ou visualizar o código.

A mãe realiza:

1. Cadastro;
2. Login;
3. Informar código da turma;
4. Solicitar entrada;
5. Administrador aprova.

Também pode existir futuramente um link de convite:

`agenda.app/turma/ABC123`

---

# 6. Perfis e permissões

Criar inicialmente três níveis:

## ADMIN

Pode:

* Criar turma;
* Editar turma;
* Aprovar usuários;
* Remover usuários;
* Cadastrar eventos;
* Editar eventos;
* Excluir eventos;
* Corrigir eventos cadastrados por outras pessoas;
* Gerenciar configurações da turma.

## MEMBRO

Pode:

* Visualizar eventos;
* Criar eventos;
* Editar seus próprios eventos;
* Excluir seus próprios eventos;
* Sugerir alterações;
* Enviar fotos da agenda;
* Utilizar IA para criar eventos.

## VISUALIZADOR

Pode apenas:

* Visualizar eventos.

Deixar a estrutura preparada para novos níveis de permissão no futuro.

---

# 7. Tela principal

A tela principal deverá ser extremamente simples e otimizada para celular.

No topo:

**Agenda da Turma**

Mostrar:

* Nome da turma;
* Nome da escola;
* Foto/ícone da turma;
* Avatar do usuário;
* Menu.

Criar navegação entre:

* Hoje;
* Semana;
* Mês;
* Todos;
* Meus eventos.

---

# 8. Visão "Hoje"

A tela inicial deverá mostrar os eventos do dia.

Exemplo:

## HOJE — 23 DE SETEMBRO

### 🎨 Atividade de Artes

Hoje

Levar:

* Lápis de cor
* Cola
* Tesoura sem ponta

---

### 📚 Tarefa de Matemática

Entrega hoje

Página 35 e 36 do livro.

---

Caso não existam eventos:

> 🎉 Nenhum compromisso para hoje!

---

# 9. Visão "Semana"

Mostrar os próximos 7 dias.

Exemplo:

### SEG 23

Nenhum evento

### TER 24

📚 Tarefa de Matemática

### QUA 25

🎨 Atividade de Artes

### QUI 26

Nenhum evento

### SEX 27

🎂 Aniversário da Maria

---

# 10. Visão "Mês"

Criar calendário mensal.

Cada dia poderá apresentar pequenos indicadores dos eventos.

Exemplo:

SETEMBRO 2026

| SEG | TER | QUA | QUI | SEX |
| --- | --- | --- | --- | --- |
| 21  | 22  | 23  | 24  | 25  |
|     |     | 📚  | 🎨  |     |
| 28  | 29  | 30  |     |     |

Ao tocar no dia, mostrar os eventos daquele dia.

---

# 11. Tela de eventos futuros

Criar uma visão chamada:

**Próximos eventos**

Mostrar eventos ordenados cronologicamente.

Exemplo:

### 08 OUT

🚌 Passeio ao Zoológico

### 10 OUT

🎨 Feira Cultural

### 15 OUT

📚 Prova de Matemática

### 20 OUT

🎂 Festa das Crianças

Essa tela é extremamente importante porque resolve o principal problema da agenda física.

---

# 12. Cadastro manual de evento

Criar botão flutuante:

**+ Adicionar evento**

Campos:

### Obrigatórios

* Título;
* Data;
* Tipo;
* Descrição.

### Opcionais

* Horário;
* Data final;
* Local;
* Valor;
* Materiais necessários;
* Observações;
* Anexo;
* Foto da agenda;
* Link;
* Responsável.

---

# 13. Categorias de eventos

Criar categorias:

* 📚 Tarefa
* 📝 Prova
* 🚌 Passeio
* 🎉 Festa
* 🎨 Atividade
* 🎒 Material
* 🏫 Evento escolar
* 👩‍🏫 Reunião
* 💰 Pagamento
* 📢 Informativo
* 🎂 Aniversário
* 🗓️ Outros

Permitir que o administrador crie categorias personalizadas futuramente.

---

# 14. Evento recorrente

Permitir eventos recorrentes futuramente.

Exemplos:

* Toda segunda-feira;
* Toda terça-feira;
* Todo mês;
* Toda semana.

Ao criar evento recorrente, permitir:

* frequência;
* data inicial;
* data final.

---

# 15. REGRA PRINCIPAL — NÃO DUPLICAR EVENTOS

O sistema deverá possuir mecanismo para impedir eventos duplicados.

Antes de criar um novo evento, verificar possíveis duplicidades considerando:

* mesma turma;
* mesma data;
* mesmo título ou título muito semelhante;
* horário, quando informado.

Exemplo:

Já existe:

> Passeio ao Zoológico — 08/10

Uma mãe tenta cadastrar:

> Passeio no Zoológico — 08/10

O sistema deverá detectar possível duplicidade.

Mostrar:

> ⚠️ Parece que este evento já foi cadastrado.

Mostrar o evento existente.

Opções:

**[Ver evento]**

**[Cadastrar mesmo assim]**

A aplicação nunca deverá bloquear definitivamente o usuário sem permitir uma ação de confirmação, pois duas atividades semelhantes podem realmente existir.

---

# 16. IA PARA LER A FOTO DA AGENDA

Essa será uma das principais funcionalidades da aplicação.

Criar botão:

**📷 Cadastrar pela foto**

Fluxo:

1. Usuário toca em "Cadastrar pela foto";
2. Abre câmera do celular;
3. Usuário tira foto da agenda;
4. Sistema envia imagem para serviço de IA/OCR;
5. IA analisa o conteúdo;
6. IA identifica informações relevantes;
7. Sistema transforma as informações em campos estruturados;
8. Usuário revisa;
9. Usuário confirma;
10. Sistema cadastra o evento.

---

# 17. Exemplo da IA

Foto:

> "Dia 08/10 passeio ao zoológico. As crianças deverão trazer autorização assinada e R$ 35,00. Saída às 8h."

A IA deverá retornar uma estrutura semelhante a:

```json
{
  "titulo": "Passeio ao Zoológico",
  "data": "2026-10-08",
  "horario": "08:00",
  "tipo": "Passeio",
  "descricao": "Passeio ao zoológico",
  "valor": 35.00,
  "materiais": [
    "Autorização assinada"
  ],
  "observacoes": "Saída às 8h"
}
```

IMPORTANTE:

A IA NÃO deverá cadastrar automaticamente o evento.

Ela deverá apenas **preencher uma prévia para conferência humana**.

O usuário deverá visualizar:

### A IA encontrou:

Título:
Passeio ao Zoológico

Data:
08/10/2026

Horário:
08:00

Tipo:
Passeio

Valor:
R$ 35,00

Descrição:
Passeio ao zoológico

Materiais:
Autorização assinada

Botões:

**[Confirmar evento]**

**[Editar]**

---

# 18. Inteligência para datas

A IA deverá compreender datas relativas.

Exemplo:

Texto:

> "Na próxima quarta-feira teremos atividade de pintura."

A IA deve identificar a próxima quarta-feira considerando a data da foto/cadastro.

Porém, como existe risco de interpretação incorreta, o sistema deverá mostrar a data encontrada e exigir confirmação.

Exemplo:

> A IA interpretou "próxima quarta-feira" como 30/09/2026.

**Está correto?**

[Sim] [Alterar]

---

# 19. Detecção de informações importantes

A IA deverá tentar identificar automaticamente:

* Data;
* Dia da semana;
* Horário;
* Título;
* Tipo do evento;
* Local;
* Valor;
* Materiais;
* Necessidade de autorização;
* Necessidade de pagamento;
* Prazo;
* Descrição;
* Observações.

Se alguma informação não existir, deixar o campo vazio.

Nunca inventar informações.

---

# 20. Confiança da IA

A IA deverá retornar também um nível de confiança por campo.

Exemplo:

Data: 95%

Horário: 91%

Valor: 98%

Local: 72%

Quando a confiança for baixa, destacar o campo para revisão.

---

# 21. Histórico da foto

Guardar a imagem original associada ao evento.

No evento poderá existir:

**Origem: Foto da agenda**

Ao tocar, o usuário poderá visualizar a foto original.

Isso é importante para que os pais possam conferir a informação posteriormente.

---

# 22. Edição de eventos

Qualquer membro poderá editar seus próprios eventos.

O administrador poderá editar qualquer evento.

Quando um usuário editar evento de outra pessoa, registrar histórico:

> Maria alterou o evento em 23/09/2026 às 19:32.

Guardar:

* usuário;
* data;
* horário;
* campo alterado;
* valor anterior;
* valor novo.

---

# 23. Exclusão

Ao excluir evento:

Mostrar confirmação:

> Tem certeza que deseja excluir este evento?

Opções:

**Cancelar**

**Excluir**

Não excluir diretamente.

Preferencialmente utilizar exclusão lógica no banco.

---

# 24. Histórico de alterações

Criar tabela de auditoria.

Registrar:

* criação;
* alteração;
* exclusão;
* usuário responsável;
* data/hora;
* valores alterados.

---

# 25. Notificações

Preparar arquitetura para notificações.

Inicialmente permitir notificações dentro do sistema.

Exemplo:

🔔 Amanhã:

🚌 Passeio ao zoológico

Não esquecer:

* Autorização;
* R$ 35,00.

Futuramente permitir:

* Push notification;
* WhatsApp;
* E-mail.

---

# 26. Lembretes

Cada evento poderá possuir lembretes.

Exemplo:

Evento:

Passeio ao Zoológico
08/10

Lembretes:

☑ 7 dias antes
☑ 3 dias antes
☑ 1 dia antes

Para tarefas:

☑ 1 dia antes

---

# 27. Busca

Criar campo:

🔎 Buscar na agenda

Permitir pesquisar por:

* título;
* descrição;
* data;
* categoria;
* local;
* usuário.

Exemplo:

Pesquisar:

"zoológico"

Mostrar todos os eventos relacionados.

---

# 28. Filtros

Permitir filtros:

* Tipo;
* Data;
* Usuário que cadastrou;
* Eventos futuros;
* Eventos passados;
* Eventos com pagamento;
* Eventos com material;
* Eventos com autorização.

---

# 29. Destaques importantes

Alguns eventos deverão possuir alertas visuais.

Exemplos:

💰 Pagamento necessário

📄 Autorização necessária

🎒 Material necessário

⏰ Horário definido

📅 Prazo

Essas informações devem aparecer no card do evento.

---

# 30. Dashboard da turma

Criar uma área simples mostrando:

**Próximo evento**

**Eventos esta semana**

**Eventos este mês**

**Pendências**

**Eventos com pagamento**

**Eventos que exigem material**

---

# 31. Tela de detalhes do evento

Ao tocar no evento:

Mostrar:

### 🚌 Passeio ao Zoológico

📅 08/10/2026

⏰ 08:00

📍 Zoológico

💰 R$ 35,00

### Descrição

Passeio ao zoológico.

### Necessário levar

☑ Autorização assinada

### Observações

Saída às 8h.

---

**Cadastrado por:** Ana

**Cadastrado em:** 23/09/2026

---

# 32. Status do evento

Criar status:

* Ativo;
* Concluído;
* Cancelado.

Eventos passados podem continuar no histórico.

Eventos cancelados deverão aparecer como:

~~Passeio ao Zoológico~~

❌ CANCELADO

---

# 33. Compartilhamento

Permitir compartilhar um evento.

Exemplo:

Botão:

**Compartilhar**

Gerar texto:

> 🚌 Passeio ao Zoológico
>
> 📅 08/10
> ⏰ 08:00
> 💰 R$ 35,00
>
> Não esquecer de enviar a autorização assinada.

Permitir compartilhar pelo menu nativo do celular.

---

# 34. Design

O design deverá ser:

* Moderno;
* Simples;
* Infantil sem parecer aplicativo infantil;
* Limpo;
* Muito fácil para pessoas que não possuem conhecimento tecnológico;
* Mobile-first.

Priorizar:

* cards;
* ícones;
* cores suaves;
* excelente contraste;
* botões grandes;
* poucos campos por tela.

Evitar excesso de informações.

---

# 35. Navegação mobile

Criar menu inferior fixo:

🏠 Hoje

📅 Agenda

➕ Adicionar

🔔 Alertas

👤 Perfil

---

# 36. Tela inicial ideal

A primeira tela após login deverá apresentar:

"Olá, Ana 👋"

"Agenda da Turma"

### Hoje

Nenhum evento hoje.

### Próximos eventos

🚌 Passeio ao Zoológico
08/10

🎨 Feira Cultural
10/10

📝 Prova de Matemática
15/10

### Atalho

📷 Cadastrar pela foto

---

# 37. Banco de dados

Criar estrutura relacional preparada para crescimento.

Entidades principais:

### users

* id
* name
* email
* password_hash
* avatar
* status
* created_at
* updated_at

### schools

* id
* name
* created_at

### classes

* id
* school_id
* name
* year
* invite_code
* status
* created_at

### class_members

* id
* class_id
* user_id
* role
* status
* joined_at

### events

* id
* class_id
* created_by
* title
* description
* event_type
* start_date
* end_date
* start_time
* end_time
* location
* amount
* status
* source
* original_image_url
* created_at
* updated_at

### event_materials

* id
* event_id
* description

### event_reminders

* id
* event_id
* reminder_type
* reminder_date
* status

### event_history

* id
* event_id
* user_id
* action
* old_data
* new_data
* created_at

### notifications

* id
* user_id
* event_id
* type
* title
* message
* read_at
* created_at

---

# 38. Segurança

Implementar:

* Senhas armazenadas com hash seguro;
* Nunca salvar senha em texto puro;
* Sessões seguras;
* Controle de autorização por turma;
* Um usuário de uma turma não pode visualizar dados privados de outra turma;
* Validar todos os dados enviados pelo frontend;
* Proteção contra SQL Injection;
* Proteção contra XSS;
* Proteção contra CSRF quando aplicável;
* Rate limiting no login;
* Limite de tamanho das imagens;
* Validação do tipo de arquivo.

---

# 39. Privacidade

Como a aplicação poderá armazenar fotos de agendas escolares e informações relacionadas a crianças, tratar os dados como privados.

Não tornar a agenda pública.

Somente membros autorizados da turma deverão acessar os eventos.

As fotos da agenda não deverão possuir URL pública sem proteção.

---

# 40. Arquitetura

Construir de maneira modular.

Separar:

Frontend
Backend
Banco de dados
Autenticação
IA/OCR
Notificações
Armazenamento de imagens

Criar APIs REST bem organizadas.

---

# 41. API

Criar endpoints semelhantes a:

POST /auth/register

POST /auth/login

POST /auth/logout

GET /me

GET /classes

POST /classes

POST /classes/join

GET /classes/{id}/events

POST /classes/{id}/events

GET /events/{id}

PUT /events/{id}

DELETE /events/{id}

POST /events/{id}/reminders

POST /ai/read-agenda

GET /notifications

PUT /notifications/{id}/read

---

# 42. IA

A camada de IA deverá ser desacoplada da aplicação.

Criar um serviço/interface:

AgendaAIService

Com método:

extractEventFromImage(image)

O retorno deverá ser estruturado em JSON.

Não deixar a aplicação diretamente dependente de um único fornecedor de IA.

Permitir futuramente trocar entre diferentes provedores.

---

# 43. Tratamento de erros da IA

Se a IA não conseguir interpretar a foto:

Mostrar:

> Não consegui identificar todas as informações dessa foto.

Permitir:

**Tentar novamente**

ou

**Preencher manualmente**

Nunca cadastrar informações inventadas pela IA.

---

# 44. Múltiplos eventos em uma mesma foto

A IA deverá ser capaz de identificar mais de um evento.

Exemplo:

Foto contém:

> 08/10 — Passeio ao zoológico

> 10/10 — Feira cultural

> 15/10 — Prova de matemática

O sistema deverá apresentar:

### Foram encontrados 3 eventos

☑ Passeio ao zoológico — 08/10

☑ Feira cultural — 10/10

☑ Prova de matemática — 15/10

O usuário poderá selecionar quais deseja cadastrar.

---

# 45. Detecção de duplicidade com IA

Além da comparação tradicional, utilizar similaridade textual para identificar possíveis duplicidades.

Exemplo:

Evento existente:

"Passeio ao Zoológico"

Novo:

"Passeio Zoológico"

A aplicação deverá identificar como possível duplicado.

---

# 46. Datas retroativas

Não impedir automaticamente eventos passados.

Permitir cadastrar eventos passados quando necessário.

Porém, perguntar:

> Este evento está no passado. Deseja continuar?

---

# 47. Fuso horário

A aplicação deverá utilizar:

America/Sao_Paulo

Todas as datas deverão ser armazenadas de maneira consistente e apresentadas no horário local.

---

# 48. Responsividade

O sistema deverá funcionar corretamente em:

* iPhone;
* Android;
* Tablets;
* Desktop.

Porém, a prioridade é:

**Mobile first.**

---

# 49. PWA

Preparar a aplicação para funcionar como PWA.

Permitir:

* adicionar à tela inicial;
* ícone próprio;
* funcionamento semelhante a aplicativo;
* cache de recursos básicos;
* suporte futuro a push notification.

---

# 50. Experiência principal

O fluxo mais importante da aplicação deverá ser extremamente simples:

LOGIN

↓

AGENDA DA TURMA

↓

📷 "Cadastrar pela foto"

↓

TIRAR FOTO

↓

IA INTERPRETA

↓

PRÉVIA DO EVENTO

↓

USUÁRIO CONFIRMA

↓

VERIFICAR DUPLICIDADE

↓

CADASTRAR

↓

EVENTO APARECE PARA TODA A TURMA

Esse fluxo deve exigir o menor número possível de cliques.

---

# 51. MVP

Na primeira versão, implementar somente:

1. Cadastro;
2. Login;
3. Criar turma;
4. Entrar em turma através de código;
5. Aprovação de membros;
6. Agenda do dia;
7. Agenda semanal;
8. Agenda mensal;
9. Lista de próximos eventos;
10. Cadastro manual;
11. Edição;
12. Exclusão;
13. Categorias;
14. Detecção de duplicidade;
15. Foto da agenda;
16. IA para extração das informações;
17. Tela de confirmação da IA;
18. Histórico básico;
19. Responsividade mobile;
20. PWA.

---

# 52. Funcionalidades futuras

Não implementar inicialmente, mas deixar arquitetura preparada para:

* WhatsApp;
* Telegram;
* Push notification;
* E-mail;
* Inteligência artificial conversacional;
* Comandos por voz;
* Integração com Google Calendar;
* Integração com Apple Calendar;
* Múltiplas turmas;
* Múltiplas escolas;
* Perfil da professora;
* Área da escola;
* Relatórios;
* Exportação PDF;
* Exportação Excel;
* Compartilhamento por link;
* Lista de materiais;
* Controle de pagamentos;
* Enquetes para os pais;
* Comunicados;
* Chat da turma.

---

# 53. Regra importante de UX

O sistema não deve tentar substituir completamente a agenda escolar.

Ele deverá funcionar como uma **segunda camada de organização**, transformando os avisos da agenda física em compromissos digitais.

A informação original deve continuar disponível através da foto da agenda.

---

# 54. Critérios de aceitação

Considerar o MVP concluído somente quando:

### Usuário

* consegue criar conta;
* consegue fazer login;
* consegue entrar em uma turma;
* consegue sair da turma.

### Turma

* administrador consegue aprovar membros;
* membros conseguem visualizar a agenda.

### Eventos

* usuário consegue cadastrar evento;
* usuário consegue editar evento;
* usuário consegue excluir evento;
* usuário consegue visualizar evento;
* eventos aparecem por dia;
* eventos aparecem por semana;
* eventos aparecem por mês;
* eventos futuros são facilmente encontrados.

### Duplicidade

* sistema identifica eventos potencialmente duplicados;
* usuário pode confirmar mesmo assim.

### IA

* usuário consegue tirar foto;
* sistema consegue enviar imagem para IA;
* IA retorna dados estruturados;
* usuário consegue revisar;
* usuário consegue corrigir;
* usuário confirma antes do cadastro;
* sistema não inventa informações ausentes.

### Segurança

* usuário não acessa turma da qual não participa;
* senha não é armazenada em texto puro;
* imagens são protegidas.

---

# 55. Diretriz para desenvolvimento

Não construir apenas uma demonstração visual.

Construir uma aplicação funcional com:

* frontend funcional;
* backend funcional;
* banco de dados;
* autenticação;
* autorização;
* APIs;
* tratamento de erros;
* validações;
* persistência;
* integração real com IA/OCR através de camada desacoplada.

Quando alguma integração externa exigir uma chave/API que ainda não estiver disponível, criar uma camada configurável através de variáveis de ambiente e um modo mock para desenvolvimento.

---

# 56. Resultado esperado

Ao final, quero uma aplicação que resolva de forma prática o seguinte problema:

A professora escreve hoje na agenda:

> "Dia 15 teremos passeio. Trazer autorização."

O responsável tira uma foto.

A IA entende:

📅 15/10/2026
🚌 Passeio
📄 Autorização necessária

O responsável confirma.

A partir desse momento, todas as mães autorizadas da turma conseguem visualizar:

> 🚌 Passeio
> 📅 15/10
> 📄 Não esquecer autorização

E, no dia 14/10, o sistema poderá lembrar:

> 🔔 Amanhã tem passeio!
> Não esqueça de enviar a autorização.

A aplicação deve ser simples o suficiente para uma mãe conseguir utilizar em poucos segundos, sem precisar entender tecnologia.
