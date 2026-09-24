"use client";
// Membros da turma: código de convite, pedidos pendentes e papéis (§5, §6).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { ROLES, ROLE_LABEL, type Role } from "@/lib/domain";
import { useClass } from "./class-context";
import { Button, Dialog, SectionHead } from "./ui";
import { useToast } from "./toast";

type Member = { id: string; name: string; email?: string; role: string; status: string; me: boolean };

export function MembersView({ inviteCode, members }: { inviteCode: string | null; members: Member[] }) {
  const c = useClass();
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState(inviteCode);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const isAdmin = c.role === "ADMIN";
  const pending = members.filter((m) => m.status === "pendente");
  const active = members.filter((m) => m.status === "ativo");

  async function act(m: Member, action: "aprovar" | "recusar" | "remover" | "alterar_papel", role?: Role) {
    setBusy(m.id);
    try {
      await api(`/api/classes/${c.classId}/members/${m.id}`, { method: "PUT", body: { action, role } });
      toast(action === "aprovar" ? `${m.name.split(" ")[0]} agora participa da turma.` : action === "recusar" ? "Pedido recusado." : action === "remover" ? "Pessoa removida da turma." : "Papel alterado.");
      router.refresh();
    } catch (x) {
      toast(x instanceof ApiClientError ? x.message : "Não foi possível concluir.");
    }
    setBusy(null);
    setRemoving(null);
  }

  async function regenerate() {
    try {
      const r = await api<{ inviteCode: string }>(`/api/classes/${c.classId}/invite-code`, { method: "POST" });
      setCode(r.inviteCode);
      toast("Novo código gerado. O anterior deixou de funcionar.");
    } catch {
      toast("Não foi possível gerar um novo código.");
    }
  }

  async function shareCode() {
    const text = `Entre na agenda da turma ${c.name} no app Agenda da Turma.\nCódigo da turma: ${code}\n${location.origin}/turmas?codigo=${code}`;
    try {
      if (navigator.share) return await navigator.share({ text });
    } catch {
      return;
    }
    await navigator.clipboard.writeText(text).then(
      () => toast("Convite copiado. Cole no WhatsApp."),
      () => toast("Não foi possível copiar."),
    );
  }

  return (
    <div className="flex flex-col pb-6">
      <h1 className="px-5 pt-5 pb-3 text-[30px] font-extrabold tracking-[-0.015em]">Membros</h1>

      {isAdmin && code && (
        <div className="mx-5 mb-6 flex flex-col gap-3 bg-ink p-4 text-bg">
          <span className="kicker">Código de convite</span>
          <span className="font-mono text-[28px] font-extrabold tracking-wider select-all">{code}</span>
          <span className="text-[13px] text-neutral-300">Quem entrar com o código fica aguardando sua aprovação.</span>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={shareCode} className="h-12 bg-accent px-4 text-left font-extrabold text-bg hover:bg-accent-600">
              Compartilhar
            </button>
            <button onClick={regenerate} className="h-12 border-2 border-bg px-4 text-left font-extrabold">
              Gerar novo
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <>
          <SectionHead right={<span className="text-[13px] text-neutral-700">{pending.length || "Nenhum"}</span>}>Pedidos de entrada</SectionHead>
          {pending.map((m) => (
            <div key={m.id} className="flex flex-col gap-2 border-b-2 border-divider px-5 py-3.5">
              <span className="flex flex-col">
                <span className="text-base font-extrabold">{m.name}</span>
                <span className="text-[13px] text-neutral-700">{m.email}</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ink" disabled={busy === m.id} onClick={() => act(m, "aprovar")}>
                  Aprovar
                </Button>
                <Button variant="danger" disabled={busy === m.id} onClick={() => act(m, "recusar")}>
                  Recusar
                </Button>
              </div>
            </div>
          ))}
          <div className="h-6" />
        </>
      )}

      <SectionHead right={<span className="text-[13px] text-neutral-700">{active.length}</span>}>Participantes</SectionHead>
      {active.map((m) => (
        <div key={m.id} className="flex items-center gap-3 border-b-2 border-divider px-5 py-3">
          <span className="flex size-9 flex-none items-center justify-center bg-ink text-sm font-extrabold text-bg">{m.name.trim()[0]?.toUpperCase()}</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-semibold">
              {m.name}
              {m.me && <span className="text-neutral-700"> (você)</span>}
            </span>
            {isAdmin && !m.me ? (
              <select
                aria-label={`Papel de ${m.name}`}
                value={m.role}
                disabled={busy === m.id}
                onChange={(e) => act(m, "alterar_papel", e.target.value as Role)}
                className="mt-1 h-9 self-start border-2 border-ink bg-bg px-2 text-sm font-semibold"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[13px] text-neutral-700">{ROLE_LABEL[m.role as Role]}</span>
            )}
          </span>
          {isAdmin && !m.me && (
            <button onClick={() => setRemoving(m)} className="h-11 flex-none px-2 text-sm font-semibold text-accent-700">
              Remover
            </button>
          )}
        </div>
      ))}

      {removing && (
        <Dialog title={`Remover ${removing.name} da turma?`} onClose={() => setRemoving(null)}>
          <span className="text-[15px] text-neutral-800">A pessoa deixa de ver a agenda. Os eventos que ela cadastrou continuam na turma.</span>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Button onClick={() => setRemoving(null)} autoFocus>
              Cancelar
            </Button>
            <Button variant="dangerSolid" onClick={() => act(removing, "remover")}>
              Remover
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
