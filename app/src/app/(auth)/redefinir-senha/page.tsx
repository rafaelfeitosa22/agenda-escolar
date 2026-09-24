import { Suspense } from "react";
import { AuthForm, AuthFrame } from "@/components/auth-form";

export default function Page() {
  return (
    <AuthFrame title="Nova senha">
      <Suspense>
        <AuthForm mode="redefinir" />
      </Suspense>
    </AuthFrame>
  );
}
