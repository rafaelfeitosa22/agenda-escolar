import { Suspense } from "react";
import { AuthForm, AuthFrame } from "@/components/auth-form";

export default function Page() {
  return (
    <AuthFrame title="Recuperar senha" subtitle="Informe seu e-mail para receber um link de nova senha.">
      <Suspense>
        <AuthForm mode="recuperar" />
      </Suspense>
    </AuthFrame>
  );
}
