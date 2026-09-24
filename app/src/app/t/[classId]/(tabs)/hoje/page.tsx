// Tela Hoje — variação 1a "Lista" (handoff › Telas › 1).
import Link from "next/link";
import { IconArrowRight, IconChevronRight } from "@/components/icons";
import { pageClass } from "@/server/page";
import { listEvents } from "@/server/events/service";
import { dateLong, todayKey } from "@/lib/dates";
import { view } from "@/lib/event-view";

export default async function HojePage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const { user, cls } = await pageClass(classId);
  const today = todayKey();
  const events = await listEvents(user.id, classId, { from: today });
  const todayList = events.filter((e) => e.startDate === today);
  const upcoming = events.filter((e) => e.startDate > today).slice(0, 5);
  const firstName = user.name.trim().split(/\s+/)[0];
  const canAdd = cls.role !== "VISUALIZADOR";
  const href = (id: string) => `/t/${classId}/eventos/${id}`;

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-6 pb-5">
        <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.015em]">{`Olá, ${firstName} 👋`}</h1>
        <p className="mt-1 text-[15px] text-neutral-700">{dateLong(today)}</p>
      </div>

      <div className="flex items-baseline justify-between border-b-2 border-ink px-5 pb-2.5">
        <h2 className="label-section">Hoje</h2>
        <span className="text-[13px] text-neutral-700">
          {todayList.length ? `${todayList.length} ${todayList.length === 1 ? "compromisso" : "compromissos"}` : "Livre"}
        </span>
      </div>
      {todayList.map((e) => {
        const v = view(e, today);
        return (
          <Link key={e.id} href={href(e.id)} className="grid grid-cols-[48px_1fr] gap-3.5 border-b-2 border-divider px-5 py-4 hover:bg-surface">
            <span className="flex size-12 items-center justify-center bg-surface text-2xl">{v.emoji}</span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="kicker text-accent-700">
                {v.type} · {v.canceled ? "Cancelado" : v.todayNote}
              </span>
              <span className={`text-lg leading-[1.2] font-extrabold ${v.canceled ? "line-through" : ""}`}>{e.title}</span>
              <span className="text-sm text-pretty text-neutral-800">{v.summary}</span>
            </span>
          </Link>
        );
      })}
      {!todayList.length && <div className="border-b-2 border-divider px-5 py-7 text-[17px] font-semibold">🎉 Nenhum compromisso para hoje!</div>}

      {canAdd && (
        <Link href={`/t/${classId}/foto`} className="m-5 flex items-center gap-3.5 bg-accent p-[18px] text-bg hover:bg-accent-600 active:bg-accent-700">
          <span className="text-[26px]">📷</span>
          <span className="flex flex-1 flex-col">
            <span className="text-lg font-extrabold">Cadastrar pela foto</span>
            <span className="text-[13px]">Fotografe a agenda. Você confere e confirma.</span>
          </span>
          <IconArrowRight size={22} stroke={2.4} />
        </Link>
      )}

      <div className={`flex items-baseline justify-between border-b-2 border-ink px-5 pb-2.5 ${canAdd ? "pt-2" : "pt-7"}`}>
        <h2 className="label-section">Próximos eventos</h2>
        <Link href={`/t/${classId}/agenda?v=todos`} className="py-1 text-sm font-semibold text-accent-700">
          Ver todos
        </Link>
      </div>
      {upcoming.map((e) => {
        const v = view(e, today);
        return (
          <Link key={e.id} href={href(e.id)} className="grid grid-cols-[52px_1fr_20px] items-center gap-3.5 border-b-2 border-divider px-5 py-3.5 hover:bg-surface">
            <span className="flex flex-col leading-none">
              <span className="text-[26px] font-extrabold">{v.dayNum}</span>
              <span className="mt-[3px] text-xs font-semibold tracking-[.06em]">{v.mon}</span>
            </span>
            <span className="flex min-w-0 flex-col gap-[3px]">
              <span className={`text-base leading-[1.25] font-semibold ${v.canceled ? "line-through" : ""}`}>
                {v.emoji} {e.title}
              </span>
              <span className={`text-[13px] ${v.relAccent ? "text-accent-700" : "text-neutral-700"}`}>
                {v.rel}
                {v.flagLine}
              </span>
            </span>
            <IconChevronRight size={18} />
          </Link>
        );
      })}
      {!upcoming.length && <div className="px-5 py-5 text-[15px] text-neutral-700">Nenhum evento futuro cadastrado.</div>}
      <div className="h-6" />
    </div>
  );
}
