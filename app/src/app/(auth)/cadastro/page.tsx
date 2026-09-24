import Link from "next/link";
import { Suspense } from "react";
import { AuthForm, AuthFrame } from "@/components/auth-form";

export default function Page() {
  return (
    <AuthFrame
      title="Criar conta"
      subtitle="Depois você entra na turma com o código de convite."
      footer={<>Já tem conta? <Link href="/login" className="font-semibold text-accent-700">Entrar</Link></>}
    >
      <Suspense>
        <AuthForm mode="cadastro" />
      </Suspense>
    </AuthFrame>
  );
}
