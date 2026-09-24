import Link from "next/link";
import { Suspense } from "react";
import { AuthForm, AuthFrame } from "@/components/auth-form";

export default function Page() {
  return (
    <AuthFrame
      title="Entrar"
      subtitle="Os compromissos da agenda escolar, num só lugar."
      footer={<>Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-accent-700">Criar conta</Link></>}
    >
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthFrame>
  );
}
