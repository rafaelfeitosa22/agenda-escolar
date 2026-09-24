import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { ApiError, forbidden, notFound } from "@/server/http";
import { canOnEvent } from "@/server/permissions";
import { requireMember } from "@/server/classes/access";
import { defaultReminders } from "@/server/notifications/service";
import { CATEGORY_IDS, EVENT_STATUS, category, normalize } from "@/lib/domain";
import { addDays, dateBR, isValidKey, todayKey } from "@/lib/dates";
import { findDuplicates } from "./duplicates";
import { describeChange, diffSnapshots, snapshot, type Snapshot } from "./audit";

const opt = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

const dateKey = z.string().refine(isValidKey, "Data inválida.");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.");

export const eventFieldsSchema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(120),
  description: z.string().trim().min(1, "Informe a descrição.").max(2000),
  eventType: z.enum(CATEGORY_IDS, { message: "Escolha o tipo." }),
  startDate: dateKey,
  endDate: dateKey.optional().nullable().transform((v) => v || null),
  startTime: time.optional().nullable().or(z.literal("")).transform((v) => v || null),
  endTime: time.optional().nullable().or(z.literal("")).transform((v) => v || null),
  location: opt(120),
  amount: z.number().min(0).max(100000).optional().nullable().transform((v) => (v == null ? null : Math.round(v * 100) / 100)),
  authorizationRequired: z.boolean().optional().default(false),
  materials: z.array(z.string().trim().min(1).max(200)).max(30).optional().default([]),
  notes: opt(2000),
  link: z.string().trim().max(500).url("Link inválido.").refine((u) => /^https?:\/\//i.test(u), "Use um link http ou https.").optional().nullable().or(z.literal("")).transform((v) => v || null),
  responsible: opt(120),
});

const controlSchema = z.object({
  /** Usuário viu o aviso de duplicidade e escolheu "Cadastrar mesmo assim". */
  force: z.boolean().optional().default(false),
  /** Usuário confirmou "Este evento está no passado. Deseja continuar?". */
  confirmPast: z.boolean().optional().default(false),
});

export const createEventSchema = eventFieldsSchema
  .extend({ uploadId: z.string().max(40).optional().nullable() })
  .merge(controlSchema)
  .refine((e) => !e.endDate || e.endDate >= e.startDate, { message: "A data final deve ser depois da data inicial.", path: ["endDate"] });

export const updateEventSchema = eventFieldsSchema
  .partial()
  .extend({ status: z.enum(EVENT_STATUS).optional() })
  .merge(controlSchema);

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

const include = {
  materials: { orderBy: { position: "asc" } },
  creator: { select: { id: true, name: true } },
} satisfies Prisma.EventInclude;

type EventRow = Prisma.EventGetPayload<{ include: typeof include }>;

export function toDTO(e: EventRow, userId: string) {
  return {
    id: e.id,
    classId: e.classId,
    title: e.title,
    description: e.description,
    eventType: e.eventType,
    startDate: e.startDate,
    endDate: e.endDate,
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
    amount: e.amount == null ? null : Number(e.amount),
    authorizationRequired: e.authorizationRequired,
    materials: e.materials.map((m) => m.description),
    notes: e.notes,
    link: e.link,
    responsible: e.responsible,
    status: e.status as (typeof EVENT_STATUS)[number],
    source: e.source as "manual" | "foto",
    originalImageUrl: e.originalImageUrl,
    createdBy: e.creator,
    mine: e.createdBy === userId,
    createdAt: e.createdAt.toISOString(),
  };
}
export type EventDTO = ReturnType<typeof toDTO>;

async function sameDayCandidates(classId: string, date: string, excludeId?: string) {
  return prisma.event.findMany({
    where: { classId, startDate: date, deletedAt: null, status: { not: "cancelado" }, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true, title: true, startDate: true, startTime: true, eventType: true },
  });
}

async function guard(classId: string, input: { title: string; startDate: string; startTime: string | null; force: boolean; confirmPast: boolean }, excludeId?: string) {
  if (!input.confirmPast && input.startDate < todayKey()) {
    throw new ApiError(409, "evento_passado", "Este evento está no passado. Deseja continuar?");
  }
  if (!input.force) {
    const dups = findDuplicates(input, await sameDayCandidates(classId, input.startDate, excludeId));
    if (dups.length) {
      throw new ApiError(409, "possivel_duplicado", "⚠️ Parece que este evento já foi cadastrado.", {
        duplicates: dups.map((d) => ({ id: d.id, title: d.title, startDate: d.startDate, startTime: d.startTime, eventType: d.eventType, similarity: Math.round(d.similarity * 100) / 100 })),
      });
    }
  }
}

/** Checagem de duplicidade sem gravar nada (usada pela prévia da IA antes de confirmar). */
export async function checkDuplicates(userId: string, classId: string, input: { title: string; startDate: string; startTime?: string | null }) {
  await requireMember(userId, classId, "event.view");
  return findDuplicates(input, await sameDayCandidates(classId, input.startDate));
}

export async function listEvents(
  userId: string,
  classId: string,
  f: { from?: string; to?: string; mine?: boolean; q?: string; type?: string } = {},
) {
  await requireMember(userId, classId, "event.view");
  const where: Prisma.EventWhereInput = { classId, deletedAt: null };
  if (f.from || f.to) where.startDate = { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) };
  if (f.mine) where.createdBy = userId;
  if (f.type) where.eventType = f.type;
  const rows = await prisma.event.findMany({ where, include, orderBy: [{ startDate: "asc" }, { startTime: "asc" }, { createdAt: "asc" }] });
  let list = rows.map((e) => toDTO(e, userId));
  if (f.q) list = searchEvents(list, f.q);
  return list;
}

/** Busca (§27) em título, descrição, local, tipo, data e quem cadastrou, sem diferenciar acentos. */
export function searchEvents(list: EventDTO[], q: string) {
  const terms = normalize(q).split(" ").filter(Boolean);
  return list.filter((e) => {
    const hay = normalize(
      [e.title, e.description, e.location, category(e.eventType).label, dateBR(e.startDate), e.createdBy.name, e.notes, ...e.materials].filter(Boolean).join(" "),
    );
    return terms.every((t) => hay.includes(t));
  });
}

async function loadEvent(id: string) {
  const e = await prisma.event.findFirst({ where: { id, deletedAt: null }, include });
  if (!e) throw notFound("Evento não encontrado.");
  return e;
}

export async function getEvent(userId: string, id: string) {
  const e = await loadEvent(id);
  const m = await requireMember(userId, e.classId, "event.view").catch(() => {
    throw notFound("Evento não encontrado.");
  });
  const last = await prisma.eventHistory.findFirst({
    where: { eventId: id, action: "alterado" },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });
  const upload = e.uploadId ? await prisma.upload.findUnique({ where: { id: e.uploadId }, select: { createdAt: true } }) : null;
  return {
    ...toDTO(e, userId),
    sourceText: e.sourceText,
    photoTakenAt: upload?.createdAt.toISOString() ?? null,
    lastChange: last ? describeChange(last.user.name, last.oldData, last.newData, last.createdAt) : null,
    can: { edit: canOnEvent(m.role, "edit", e.createdBy === userId), delete: canOnEvent(m.role, "delete", e.createdBy === userId) },
  };
}
export type EventDetail = Awaited<ReturnType<typeof getEvent>>;

export async function createEvent(userId: string, classId: string, input: CreateEventInput) {
  await requireMember(userId, classId, "event.create");
  await guard(classId, input);

  let upload: { id: string; transcript: string | null } | null = null;
  if (input.uploadId) {
    upload = await prisma.upload.findFirst({ where: { id: input.uploadId, classId }, select: { id: true, transcript: true } });
    if (!upload) throw new ApiError(400, "foto_invalida", "A foto enviada não pertence a esta turma.");
  }

  const { force: _f, confirmPast: _c, uploadId: _u, materials, ...fields } = input;
  const created = await prisma.$transaction(async (tx) => {
    const e = await tx.event.create({
      data: {
        ...fields,
        classId,
        createdBy: userId,
        source: upload ? "foto" : "manual",
        uploadId: upload?.id ?? null,
        originalImageUrl: upload ? `/api/images/${upload.id}` : null,
        sourceText: upload?.transcript ?? null,
        materials: { create: materials.map((description, position) => ({ description, position })) },
        reminders: { create: defaultReminders(fields.eventType, fields.startDate) },
      },
      include,
    });
    await tx.eventHistory.create({ data: { eventId: e.id, userId, action: "criado", newData: JSON.stringify(snapshot(e)) } });
    return e;
  });
  return toDTO(created, userId);
}

export async function updateEvent(userId: string, id: string, input: UpdateEventInput) {
  const e = await loadEvent(id);
  const m = await requireMember(userId, e.classId, "event.view").catch(() => {
    throw notFound("Evento não encontrado.");
  });
  if (!canOnEvent(m.role, "edit", e.createdBy === userId)) throw forbidden("Você só pode editar os eventos que cadastrou.");

  const before = snapshot(e);
  const { force, confirmPast, materials, ...fields } = input;
  const after: Snapshot = { ...before, ...fields, ...(materials ? { materials } : {}) } as Snapshot;
  if (after.endDate && after.endDate < after.startDate) throw new ApiError(400, "dados_invalidos", "A data final deve ser depois da data inicial.");

  const changes = diffSnapshots(before, after);
  if (!changes.old || Object.keys(changes.old).length === 0) return toDTO(e, userId);

  // Duplicidade e data passada só importam quando título/data/horário mudam.
  if ("title" in changes.old || "startDate" in changes.old || "startTime" in changes.old) {
    await guard(e.classId, { title: after.title, startDate: after.startDate, startTime: after.startTime, force, confirmPast: confirmPast || !("startDate" in changes.old) }, id);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (materials) {
      await tx.eventMaterial.deleteMany({ where: { eventId: id } });
      await tx.eventMaterial.createMany({ data: materials.map((description, position) => ({ eventId: id, description, position })) });
    }
    if ("startDate" in changes.old! || "eventType" in changes.old!) {
      await tx.eventReminder.deleteMany({ where: { eventId: id } });
      await tx.eventReminder.createMany({ data: defaultReminders(after.eventType, after.startDate).map((r) => ({ ...r, eventId: id })) });
    }
    const u = await tx.event.update({ where: { id }, data: fields, include });
    await tx.eventHistory.create({ data: { eventId: id, userId, action: "alterado", oldData: JSON.stringify(changes.old), newData: JSON.stringify(changes.new) } });
    return u;
  });
  return toDTO(updated, userId);
}

/** Exclusão lógica (§23): o evento some da agenda, mas continua no banco e na auditoria. */
export async function deleteEvent(userId: string, id: string) {
  const e = await loadEvent(id);
  const m = await requireMember(userId, e.classId, "event.view").catch(() => {
    throw notFound("Evento não encontrado.");
  });
  if (!canOnEvent(m.role, "delete", e.createdBy === userId)) throw forbidden("Você só pode excluir os eventos que cadastrou.");
  await prisma.$transaction([
    prisma.event.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: userId } }),
    prisma.eventReminder.updateMany({ where: { eventId: id }, data: { status: "cancelado" } }),
    prisma.eventHistory.create({ data: { eventId: id, userId, action: "excluido", oldData: JSON.stringify(snapshot(e)) } }),
  ]);
  return { ok: true };
}

export const reminderSchema = z.object({ daysBefore: z.array(z.number().int().min(0).max(60)).max(10) });

export async function setReminders(userId: string, id: string, daysBefore: number[]) {
  const e = await loadEvent(id);
  const m = await requireMember(userId, e.classId, "event.view").catch(() => {
    throw notFound("Evento não encontrado.");
  });
  if (!canOnEvent(m.role, "edit", e.createdBy === userId)) throw forbidden();
  const rows = [...new Set(daysBefore)].map((d) => ({ eventId: id, reminderType: `${d}d`, reminderDate: addDays(e.startDate, -d) }));
  await prisma.$transaction([prisma.eventReminder.deleteMany({ where: { eventId: id } }), prisma.eventReminder.createMany({ data: rows })]);
  return prisma.eventReminder.findMany({ where: { eventId: id }, orderBy: { reminderDate: "asc" } });
}
