"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { instantBR } from "@/lib/dates";
import { useClass } from "./class-context";
import { IconChevronRight } from "./icons";

type Item = { id: string; title: string; message: string; type: string; read: boolean; createdAt: string; href: string | null };

export function AlertsList({ items }: { items: Item[] }) {
  const c = useClass();
  const router = useRouter();

  async function open(n: Item) {
    if (!n.read) await api(`/api/notifications/${n.id}/read`, { method: "PUT" }).catch(() => {});
    if (n.href) router.push(n.href.startsWith("/") ? n.href : `/t/${c.classId}/${n.href}`);
    router.refresh();
  }

  if (!items.length) {
    return (
      <div className="border-t-2 border-ink px-5 py-7">
        <p className="text-[17px] font-semibold">🔔 Nenhum alerta por enquanto.</p>
        <p className="mt-1 text-[15px] text-neutral-700">Você será avisado aqui antes dos passeios, provas, pagamentos e entregas.</p>
      </div>
    );
  }
  return (
    <div className="border-t-2 border-ink">
      {items.map((n) => (
        <button key={n.id} onClick={() => open(n)} className="grid w-full grid-cols-[12px_1fr_20px] items-center gap-3 border-b-2 border-divider px-5 py-3.5 text-left hover:bg-surface">
          <span className={`size-3 ${n.read ? "" : "bg-accent"}`} aria-label={n.read ? undefined : "Não lido"} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className={`text-base leading-tight ${n.read ? "font-semibold" : "font-extrabold"}`}>{n.title}</span>
            <span className="text-sm text-neutral-800">{n.message}</span>
            <span className="text-xs text-neutral-700">{instantBR(new Date(n.createdAt)).date}</span>
          </span>
          {n.href ? <IconChevronRight size={18} /> : <span />}
        </button>
      ))}
      <div className="h-6" />
    </div>
  );
}
