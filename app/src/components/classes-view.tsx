"use client";
// Turmas do usuário, entrada por código de convite (§5) e criação de turma.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiClientError } from "@/lib/api";
import { ROLE_LABEL, type Role } from "@/lib/domain";
import { IconChevronRight } from "./icons";
import { Button, ErrorBox, Field, SectionHead } from "./ui";

type Cls = { id: string; name: string; school: string; emoji: string; role: string; status: string };

export function ClassesView({ userName, classes, initialCode, canCreate }: { userName: string; classes: Cls[]; initialCode: string; canCreate: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [joinMsg, setJoinMsg] = useState("");
  const [joinErr, setJoinErr] = useState("");
  const [creating, setCreating] = useState(false);
  const [nc, setNc] = useState({ name: "", schoolName: "", year: String(new Date().getFullYear()) });
  const [createErr, setCreateErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function join(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setJoinErr("");
    try {
      const r = await api<{ classId: string; status: string; className: string }>("/api/classes/join", { body: { code } });
      if (r.status === "ativo") return router.push(`/t/${r.classId}/hoje`);
      setJoinMsg(`Pedido enviado para a turma ${r.className}. Assim que a administração aprovar, a agenda aparece aqui.`);
      setCode("");
      router.refresh();
    } catch (x) {
      setJoinErr(x instanceof ApiClientError ? x.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setCreateErr("");
    try {
      const r = await api<{ class: { id: string } }>("/api/classes", { body: { ...nc, year: Number(nc.year) } });
      router.push(`/t/${r.class.id}/membros`);
    } catch (x) {
      setCreateErr(x instanceof ApiClientError ? x.message : "Não foi possível criar.");
      setBusy(false);
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg pb-8 min-[481px]:border-x-2 min-[481px]:border-ink">
      <div className="flex items-center gap-3 border-b-2 border-divider px-5 pt-[calc(8px+env(safe-area-inset-top))] pb-3">
        <div className="flex size-10 flex-none items-center justify-center bg-accent text-xl text-bg">🌻</div>
        <span className="flex-1 text-[15px] font-extrabold">Agenda da Turma</span>
        <button onClick={logout} className="h-11 px-2 text-sm font-semibold text-accent-700">
          Sair
        </button>
      </div>
      <div className="px-5 pt-6 pb-5">
        <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.015em]">Olá, {userName.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-[15px] text-neutral-700">{classes.length ? "Escolha a turma." : "Entre na turma com o código que a administração enviou."}</p>
      </div>

      {!!classes.length && (
        <>
          <SectionHead>Suas turmas</SectionHead>
          {classes.map((c) =>
            c.status === "ativo" ? (
              <Link key={c.id} href={`/t/${c.id}/hoje`} className="grid grid-cols-[40px_1fr_20px] items-center gap-3 border-b-2 border-divider px-5 py-3.5 hover:bg-surface">
                <span className="flex size-10 items-center justify-center bg-accent text-xl text-bg">{c.emoji}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-extrabold">{c.name}</span>
                  <span className="truncate text-[13px] text-neutral-700">
                    {c.school} · {ROLE_LABEL[c.role as Role]}
                  </span>
                </span>
                <IconChevronRight size={18} />
              </Link>
            ) : (
              <div key={c.id} className="grid grid-cols-[40px_1fr] items-center gap-3 border-b-2 border-divider px-5 py-3.5">
                <span className="flex size-10 items-center justify-center bg-surface text-xl">{c.emoji}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-extrabold">{c.name}</span>
                  <span className="text-[13px] font-semibold text-accent-700">⏳ Aguardando aprovação</span>
                </span>
              </div>
            ),
          )}
          <div className="h-6" />
        </>
      )}

      <SectionHead>Entrar em uma turma</SectionHead>
      <form onSubmit={join} className="flex flex-col gap-3 px-5 pt-4 pb-6">
        {joinMsg && <div className="border-l-4 border-ink bg-surface px-3 py-2.5 text-[15px] font-semibold">{joinMsg}</div>}
        <ErrorBox>{joinErr}</ErrorBox>
        <Field label="Código da turma" hint="Ex.: MAITE-2026">
          <input className="field-input font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" spellCheck={false} />
        </Field>
        <Button variant="primary" size="lg" arrow type="submit" disabled={busy || code.trim().length < 3}>
          Solicitar entrada
        </Button>
      </form>

      {canCreate && <SectionHead>Administrar uma turma</SectionHead>}
      {!canCreate ? null : !creating ? (
        <div className="px-5 pt-4">
          <Button onClick={() => setCreating(true)}>+ Criar nova turma</Button>
        </div>
      ) : (
        <form onSubmit={create} className="flex flex-col gap-3 px-5 pt-4">
          <ErrorBox>{createErr}</ErrorBox>
          <Field label="Nome da turma">
            <input className="field-input" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} placeholder="Ex.: Jardim II - Vespertino" maxLength={80} />
          </Field>
          <Field label="Escola">
            <input className="field-input" value={nc.schoolName} onChange={(e) => setNc({ ...nc, schoolName: e.target.value })} maxLength={120} />
          </Field>
          <Field label="Ano letivo">
            <input className="field-input" inputMode="numeric" value={nc.year} onChange={(e) => setNc({ ...nc, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          </Field>
          <Button variant="ink" type="submit" disabled={busy}>
            Criar turma
          </Button>
          <p className="text-[13px] text-neutral-700">Você será administrador(a) e receberá um código para convidar as famílias.</p>
        </form>
      )}
    </main>
  );
}
