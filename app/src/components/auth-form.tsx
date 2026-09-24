"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { api, ApiClientError } from "@/lib/api";
import { Button, ErrorBox, Field } from "./ui";

export function AuthFrame({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg">
      <div className="flex items-center gap-3 border-b-2 border-divider px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-3">
        <div className="flex size-10 flex-none items-center justify-center bg-accent text-xl text-bg">🌻</div>
        <span className="text-[15px] font-extrabold">Agenda da Turma</span>
      </div>
      <div className="px-5 pt-6 pb-5">
        <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.015em]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-neutral-700">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-4 px-5">{children}</div>
      {footer && <div className="mt-auto border-t-2 border-divider px-5 py-5 text-[15px]">{footer}</div>}
    </main>
  );
}

type Mode = "login" | "cadastro" | "recuperar" | "redefinir";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [v, setV] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await api("/api/auth/login", { body: { email: v.email, password: v.password } });
      if (mode === "cadastro") await api("/api/auth/register", { body: v });
      if (mode === "recuperar") {
        const r = await api<{ message: string }>("/api/auth/forgot-password", { body: { email: v.email } });
        setDone(r.message);
        return;
      }
      if (mode === "redefinir") {
        await api("/api/auth/reset-password", { body: { token: params.get("token") ?? "", password: v.password } });
        setDone("Senha alterada. Entre com a nova senha.");
        return;
      }
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : mode === "cadastro" ? "/turmas" : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <div className="border-l-4 border-ink bg-surface px-3 py-3 text-[15px] font-semibold">{done}</div>
        <Link href="/login" className="text-[15px] font-semibold text-accent-700">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <ErrorBox>{error}</ErrorBox>
      {mode === "cadastro" && (
        <Field label="Seu nome">
          <input className="field-input" value={v.name} onChange={set("name")} autoComplete="name" required />
        </Field>
      )}
      {mode !== "redefinir" && (
        <Field label="E-mail">
          <input className="field-input" type="email" inputMode="email" value={v.email} onChange={set("email")} autoComplete="email" required />
        </Field>
      )}
      {mode !== "recuperar" && (
        <Field label={mode === "redefinir" ? "Nova senha" : "Senha"} hint={mode !== "login" ? "Pelo menos 8 caracteres." : undefined}>
          <input className="field-input" type="password" value={v.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} required />
        </Field>
      )}
      <Button variant="primary" size="lg" arrow disabled={busy} type="submit">
        {busy ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "cadastro" ? "Criar conta" : mode === "recuperar" ? "Enviar link" : "Salvar nova senha"}
      </Button>
      {mode === "login" && (
        <Link href="/recuperar-senha" className="py-2 text-[15px] font-semibold text-accent-700">
          Esqueci minha senha
        </Link>
      )}
    </form>
  );
}
