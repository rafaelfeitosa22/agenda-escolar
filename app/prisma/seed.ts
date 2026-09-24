// Seed de desenvolvimento: a turma do protótipo com os eventos de exemplo do handoff.
// Todas as contas usam a senha "agenda123".
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PEOPLE = [
  { key: "ana", name: "Ana Souza", email: "ana@agenda.dev", role: "ADMIN" },
  { key: "carla", name: "Carla Mendes", email: "carla@agenda.dev", role: "MEMBRO" },
  { key: "juliana", name: "Juliana Lima", email: "juliana@agenda.dev", role: "MEMBRO" },
  { key: "maria", name: "Maria Oliveira", email: "maria@agenda.dev", role: "ADMIN" },
  { key: "paulo", name: "Paulo Ramos", email: "paulo@agenda.dev", role: "VISUALIZADOR" },
] as const;

type Seed = {
  id: string; type: string; title: string; date: string; time?: string; place?: string; amount?: number; auth?: boolean;
  desc: string; materials?: string[]; obs?: string; status?: string; by: string; created: string; source: "foto" | "manual";
  transcript?: string; history?: { by: string; at: string; old: object; new: object };
};

// Mesmos dados do protótipo (design_handoff_agenda_da_turma/prototipo).
const EVENTS: Seed[] = [
  { id: "artes", type: "atividade", title: "Atividade de Artes", date: "2026-09-23", place: "Sala de artes", desc: "Aula de colagem com a professora Júlia.", materials: ["Lápis de cor", "Cola", "Tesoura sem ponta"], by: "carla", created: "2026-09-18T10:00:00-03:00", source: "foto", transcript: "Quarta-feira, dia 23, aula de artes. Enviar lápis de cor, cola e tesoura sem ponta." },
  { id: "mat", type: "tarefa", title: "Tarefa de Matemática", date: "2026-09-23", desc: "Página 35 e 36 do livro.", by: "ana", created: "2026-09-21T18:20:00-03:00", source: "foto", transcript: "Tarefa: páginas 35 e 36 do livro de matemática. Entregar quarta." },
  { id: "maria", type: "aniversario", title: "Aniversário da Maria", date: "2026-09-25", time: "15:00", place: "Pátio", desc: "Comemoração no fim da aula. A família da Maria levará o bolo.", by: "juliana", created: "2026-09-20T09:00:00-03:00", source: "manual" },
  { id: "reuniao", type: "reuniao", title: "Reunião de pais", date: "2026-09-29", time: "19:00", place: "Auditório", desc: "Apresentação do projeto do 4º bimestre.", by: "carla", created: "2026-09-19T08:40:00-03:00", source: "foto", transcript: "Dia 29/09 às 19h reunião de pais no auditório." },
  { id: "pintura", type: "atividade", title: "Atividade de pintura", date: "2026-09-30", desc: "Pintura com guache.", materials: ["Camiseta velha"], obs: "A professora escreveu “próxima quarta-feira”; a data foi confirmada como 30/09.", by: "ana", created: "2026-09-23T07:50:00-03:00", source: "foto", transcript: "Na próxima quarta-feira teremos atividade de pintura. Mandar camiseta velha." },
  { id: "musica", type: "evento_escolar", title: "Apresentação de música", date: "2026-10-01", time: "10:00", place: "Quadra", desc: "Apresentação do coral das turmas do 1º ano.", status: "cancelado", by: "carla", created: "2026-09-15T11:00:00-03:00", source: "manual", history: { by: "carla", at: "2026-09-22T08:15:00-03:00", old: { status: "ativo" }, new: { status: "cancelado" } } },
  { id: "zoo", type: "passeio", title: "Passeio ao Zoológico", date: "2026-10-08", time: "08:00", place: "Zoológico", amount: 35, auth: true, desc: "Passeio ao zoológico.", materials: ["Autorização assinada"], obs: "Saída às 8h.", by: "ana", created: "2026-09-23T07:30:00-03:00", source: "foto", transcript: "Dia 08/10 passeio ao zoológico. As crianças deverão trazer autorização assinada e R$ 35,00. Saída às 8h.", history: { by: "maria", at: "2026-09-23T19:32:00-03:00", old: { startTime: "07:30" }, new: { startTime: "08:00" } } },
  { id: "feira", type: "evento_escolar", title: "Feira Cultural", date: "2026-10-10", time: "09:00", place: "Quadra da escola", desc: "Apresentação dos trabalhos das turmas. Famílias convidadas.", by: "juliana", created: "2026-09-22T12:00:00-03:00", source: "manual" },
  { id: "prova", type: "prova", title: "Prova de Matemática", date: "2026-10-15", desc: "Conteúdo: adição e subtração (páginas 20 a 36).", by: "carla", created: "2026-09-22T13:00:00-03:00", source: "foto", transcript: "15/10 prova de matemática. Estudar páginas 20 a 36." },
  { id: "festa", type: "festa", title: "Festa das Crianças", date: "2026-10-20", time: "13:30", amount: 15, desc: "Lanche coletivo e brincadeiras.", materials: ["Um prato de salgado ou doce"], by: "juliana", created: "2026-09-22T14:00:00-03:00", source: "manual" },
];

function addDays(k: string, n: number) {
  const d = new Date(k + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  // O seed APAGA tudo antes de recriar os dados de exemplo: só roda no SQLite local.
  if (!process.env.DATABASE_URL?.startsWith("file:")) {
    console.error("Seed recusado: DATABASE_URL não é um banco SQLite local. O seed apaga todos os dados e nunca deve rodar em produção.");
    process.exit(1);
  }
  // Limpa na ordem das dependências.
  await prisma.rateLimitHit.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.eventHistory.deleteMany();
  await prisma.eventReminder.deleteMany();
  await prisma.eventMaterial.deleteMany();
  await prisma.event.deleteMany();
  await prisma.upload.deleteMany();
  await prisma.classMember.deleteMany();
  await prisma.class.deleteMany();
  await prisma.school.deleteMany();
  await prisma.session.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("agenda123", 12);
  const users: Record<string, string> = {};
  for (const p of PEOPLE) {
    const u = await prisma.user.create({ data: { name: p.name, email: p.email, passwordHash } });
    users[p.key] = u.id;
  }
  const pending = await prisma.user.create({ data: { name: "Beatriz Costa", email: "beatriz@agenda.dev", passwordHash } });
  const outsider = await prisma.user.create({ data: { name: "Roberto Alves", email: "roberto@agenda.dev", passwordHash } });

  const school = await prisma.school.create({ data: { name: "Escola CENEB Kids Águas Claras" } });
  const cls = await prisma.class.create({ data: { schoolId: school.id, name: "Jardim II - Vespertino", year: 2026, emoji: "🌻", inviteCode: "MAITE-2026" } });
  for (const p of PEOPLE) {
    await prisma.classMember.create({ data: { classId: cls.id, userId: users[p.key], role: p.role, status: "ativo", joinedAt: new Date("2026-08-01T12:00:00-03:00") } });
  }
  await prisma.classMember.create({ data: { classId: cls.id, userId: pending.id, role: "MEMBRO", status: "pendente" } });

  // Outra turma, para demonstrar o isolamento entre turmas.
  const other = await prisma.class.create({ data: { schoolId: school.id, name: "Jardim I - Matutino", year: 2026, emoji: "🐢", inviteCode: "TARTARUGA-26" } });
  await prisma.classMember.create({ data: { classId: other.id, userId: outsider.id, role: "ADMIN", status: "ativo" } });
  await prisma.event.create({ data: { classId: other.id, createdBy: outsider.id, title: "Piquenique no parque", description: "Turma do Jardim I.", eventType: "passeio", startDate: "2026-10-02" } });

  for (const e of EVENTS) {
    const createdAt = new Date(e.created);
    const ev = await prisma.event.create({
      data: {
        classId: cls.id,
        createdBy: users[e.by],
        title: e.title,
        description: e.desc,
        eventType: e.type,
        startDate: e.date,
        startTime: e.time ?? null,
        location: e.place ?? null,
        amount: e.amount ?? null,
        authorizationRequired: !!e.auth,
        notes: e.obs ?? null,
        status: e.status ?? "ativo",
        source: e.source,
        sourceText: e.transcript ?? null,
        createdAt,
        materials: { create: (e.materials ?? []).map((description, position) => ({ description, position })) },
        reminders: {
          create: (e.type === "tarefa" || e.type === "prova" ? [1] : [7, 3, 1]).map((d) => ({ reminderType: `${d}d`, reminderDate: addDays(e.date, -d) })),
        },
      },
    });
    await prisma.eventHistory.create({ data: { eventId: ev.id, userId: users[e.by], action: "criado", newData: JSON.stringify({ title: e.title, startDate: e.date }), createdAt } });
    if (e.history) {
      await prisma.eventHistory.create({
        data: { eventId: ev.id, userId: users[e.history.by], action: "alterado", oldData: JSON.stringify(e.history.old), newData: JSON.stringify(e.history.new), createdAt: new Date(e.history.at) },
      });
    }
  }

  console.log("Seed concluído.");
  console.log("  Turma: Jardim II - Vespertino · código MAITE-2026");
  console.log("  Logins (senha agenda123): ana@ (admin), maria@ (admin), carla@, juliana@ (membros), paulo@ (visualizador), beatriz@ (pendente), roberto@ (outra turma) — todos @agenda.dev");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
