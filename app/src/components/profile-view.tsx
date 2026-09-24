"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiClientError } from "@/lib/api";
import { ROLE_LABEL, type Role } from "@/lib/domain";
import { useClass } from "./class-context";
import { Button, Dialog, ErrorBox, Field, SectionHead } from "./ui";
import { flashNext, useToast } from "./toast";

type Cls = { id: string; name: string; school: string; emoji: string; role: string; status: string };

export function ProfileView({ user, classes }: { user: { name: string; email: string }; classes: Cls[] }) {
  const c = useClass();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ current: "", password: "" });
  const [err, setErr] = useState({ profile: "", pw: "" });
  const [leaving, setLeaving] = useState<Cls | null>(null);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/me", { method: "PUT", body: { name } });
      setErr({ ...err, profile: "" });
      toast("Perfil atualizado.");
      router.refresh();
    } catch (x) {
      setErr({ ...err, profile: x instanceof ApiClientError ? x.message : "Erro ao salvar." });
    }
  }

  async function savePw(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/me/password", { method: "PUT", body: pw });
      setPw({ current: "", password: "" });
      setErr({ ...err, pw: "" });
      toast("Senha alterada.");
    } catch (x) {
      setErr({ ...err, pw: x instanceof ApiClientError ? x.message : "Erro ao salvar." });
    }
  }

  async function leave(cls: Cls) {
    try {
      await api(`/api/classes/${cls.id}/leave`, { method: "POST" });
      flashNext(`Você saiu da turma ${cls.name}.`);
      router.replace(cls.id === c.classId ? "/turmas" : location.pathname);
      router.refresh();
    } catch (x) {
      toast(x instanceof ApiClientError ? x.message : "Não foi possível sair.");
    }
    setLeaving(null);
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col pb-6">
      <div className="flex items-center gap-4 px-5 pt-5 pb-5">
        <span className="flex size-14 flex-none items-center justify-center bg-ink text-2xl font-extrabold text-bg">{user.name.trim()[0]?.toUpperCase()}</span>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-[26px] leading-[1.1] font-extrabold tracking-[-0.015em]">{user.name}</h1>
          <span className="truncate text-[15px] text-neutral-700">{user.email}</span>
        </div>
      </div>

      <SectionHead>Seus dados</SectionHead>
      <form onSubmit={saveProfile} className="flex flex-col gap-3 px-5 pt-4 pb-6">
        <ErrorBox>{err.profile}</ErrorBox>
        <Field label="Nome do Aluno(a)">
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="off" />
        </Field>
        <Button type="submit" disabled={name.trim() === user.name}>
          Salvar nome
        </Button>
      </form>

      <SectionHead>Alterar senha</SectionHead>
      <form onSubmit={savePw} className="flex flex-col gap-3 px-5 pt-4 pb-6">
        <ErrorBox>{err.pw}</ErrorBox>
        <Field label="Senha atual">
          <input type="password" className="field-input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
        </Field>
        <Field label="Nova senha" hint="Pelo menos 8 caracteres.">
          <input type="password" className="field-input" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} autoComplete="new-password" />
        </Field>
        <Button type="submit" disabled={!pw.current || pw.password.length < 8}>
          Alterar senha
        </Button>
      </form>

      <SectionHead right={<Link href="/turmas" className="py-1 text-sm font-semibold text-accent-700">Entrar em outra</Link>}>Suas turmas</SectionHead>
      {classes.map((cls) => (
        <div key={cls.id} className="flex items-center gap-3 border-b-2 border-divider px-5 py-3">
          <span className="flex size-10 flex-none items-center justify-center bg-surface text-xl">{cls.emoji}</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-extrabold">{cls.name}</span>
            <span className="text-[13px] text-neutral-700">{cls.status === "pendente" ? "Aguardando aprovação" : ROLE_LABEL[cls.role as Role]}</span>
          </span>
          <button onClick={() => setLeaving(cls)} className="h-11 flex-none px-2 text-sm font-semibold text-accent-700">
            {cls.status === "pendente" ? "Cancelar pedido" : "Sair da turma"}
          </button>
        </div>
      ))}

      <div className="px-5 pt-6">
        <Button variant="danger" onClick={logout}>
          Sair da conta
        </Button>
      </div>

      {leaving && (
        <Dialog title={`Sair da turma ${leaving.name}?`} onClose={() => setLeaving(null)}>
          <span className="text-[15px] text-neutral-800">Você deixa de ver a agenda. Para voltar, será preciso o código de convite e uma nova aprovação.</span>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Button onClick={() => setLeaving(null)} autoFocus>
              Cancelar
            </Button>
            <Button variant="dangerSolid" onClick={() => leave(leaving)}>
              Sair
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
