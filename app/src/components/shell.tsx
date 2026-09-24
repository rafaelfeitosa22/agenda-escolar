"use client";
// Moldura das telas da turma: cabeçalho, área rolável e barra inferior (handoff › Estrutura do app).
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { canCreate, useClass } from "./class-context";
import { IconBell, IconCalendar, IconHouse, IconMenu, IconPlus, IconUser } from "./icons";
import { Sheet } from "./ui";
import { useToast } from "./toast";

export function ClassHeader() {
  const c = useClass();
  const [menu, setMenu] = useState(false);
  return (
    <>
      <header className="flex flex-none items-center gap-3 border-b-2 border-divider px-5 pt-[calc(8px+env(safe-area-inset-top))] pb-3">
        <Link href={`/t/${c.classId}/hoje`} className="flex size-10 flex-none items-center justify-center bg-accent text-xl text-bg" aria-label="Início">
          {c.emoji}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] leading-[1.2] font-extrabold">{c.name}</span>
          <span className="truncate text-xs text-neutral-700">{c.school}</span>
        </div>
        <Link href={`/t/${c.classId}/perfil`} aria-label="Perfil" className="flex size-9 flex-none items-center justify-center bg-ink text-sm font-extrabold text-bg">
          {c.user.name.trim()[0]?.toUpperCase()}
        </Link>
        <button type="button" onClick={() => setMenu(true)} aria-label="Menu" className="flex size-9 flex-none items-center justify-center">
          <IconMenu />
        </button>
      </header>
      {menu && <MenuSheet onClose={() => setMenu(false)} />}
    </>
  );
}

function MenuSheet({ onClose }: { onClose: () => void }) {
  const c = useClass();
  const router = useRouter();
  const item = "flex min-h-12 items-center border-b-2 border-divider py-2 text-[17px] font-extrabold hover:bg-surface";
  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }
  return (
    <Sheet title="Menu" onClose={onClose}>
      <nav className="flex flex-col border-t-2 border-ink" onClick={onClose}>
        <Link className={item} href={`/t/${c.classId}/busca`}>🔎 Buscar na agenda</Link>
        <Link className={item} href={`/t/${c.classId}/membros`}>👥 {c.role === "ADMIN" ? "Membros e convite" : "Membros da turma"}</Link>
        <Link className={item} href="/turmas">🏫 Trocar de turma</Link>
        <Link className={item} href={`/t/${c.classId}/perfil`}>👤 Perfil</Link>
        <button type="button" className={`${item} text-left text-accent-700`} onClick={logout}>Sair da conta</button>
      </nav>
    </Sheet>
  );
}

/** Área rolável; volta ao topo ao trocar de tela (handoff › Estrutura do app). */
export function ScrollArea({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const search = useSearchParams();
  const view = search.get("v");
  useEffect(() => {
    ref.current?.scrollTo(0, 0);
  }, [pathname, view]);
  return (
    <div ref={ref} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
      {children}
    </div>
  );
}

export function BottomNav({ unread = 0 }: { unread?: number }) {
  const c = useClass();
  const pathname = usePathname();
  const toast = useToast();
  const [add, setAdd] = useState(false);
  const base = `/t/${c.classId}`;
  const tab = (href: string, label: string, icon: ReactNode, badge?: number) => {
    const active = pathname === href;
    return (
      <Link href={href} aria-current={active ? "page" : undefined} className={`relative flex h-[52px] flex-col items-center justify-center gap-[3px] ${active ? "text-accent-700" : "text-neutral-700"}`}>
        {icon}
        <span className="text-xs font-semibold">{label}</span>
        {!!badge && (
          <span className="absolute top-0.5 left-[calc(50%+4px)] flex h-[18px] min-w-[18px] items-center justify-center bg-accent px-1 text-[11px] leading-none font-extrabold text-bg" aria-label={`${badge} não lidos`}>
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </Link>
    );
  };
  return (
    <>
      <nav className="grid flex-none grid-cols-5 items-start border-t-2 border-ink bg-bg pt-1.5 pb-[max(env(safe-area-inset-bottom),26px)]" aria-label="Navegação principal">
        {tab(`${base}/hoje`, "Hoje", <IconHouse />)}
        {tab(`${base}/agenda`, "Agenda", <IconCalendar />)}
        <button
          type="button"
          aria-label="Adicionar evento"
          onClick={() => (canCreate(c.role) ? setAdd(true) : toast("Seu perfil nesta turma só permite visualizar."))}
          className="flex h-[52px] items-center justify-center"
        >
          <span className="flex size-[52px] items-center justify-center bg-accent text-bg hover:bg-accent-600 active:bg-accent-700">
            <IconPlus size={26} stroke={2.6} />
          </span>
        </button>
        {tab(`${base}/alertas`, "Alertas", <IconBell />, unread)}
        {tab(`${base}/perfil`, "Perfil", <IconUser />)}
      </nav>
      {add && <AddSheet onClose={() => setAdd(false)} />}
    </>
  );
}

export function AddSheet({ onClose, date }: { onClose: () => void; date?: string }) {
  const c = useClass();
  return (
    <Sheet title="Adicionar evento" onClose={onClose}>
      <Link href={`/t/${c.classId}/foto`} onClick={onClose} className="flex items-center gap-3 bg-accent p-4 text-bg hover:bg-accent-600">
        <span className="text-2xl">📷</span>
        <span className="flex flex-col">
          <span className="text-[17px] font-extrabold">Cadastrar pela foto</span>
          <span className="text-[13px]">Mais rápido: a IA preenche para você</span>
        </span>
      </Link>
      <Link href={`/t/${c.classId}/eventos/novo${date ? `?data=${date}` : ""}`} onClick={onClose} className="flex items-center gap-3 border-2 border-ink p-4 hover:bg-surface">
        <span className="text-2xl">✏️</span>
        <span className="text-[17px] font-extrabold">Preencher manualmente</span>
      </Link>
    </Sheet>
  );
}
