"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";

export type ClassCtx = {
  classId: string;
  name: string;
  school: string;
  emoji: string;
  role: "ADMIN" | "MEMBRO" | "VISUALIZADOR";
  user: { id: string; name: string };
  today: string;
};

const Ctx = createContext<ClassCtx | null>(null);

export function ClassProvider({ value, children }: { value: ClassCtx; children: ReactNode }) {
  useEffect(() => {
    // Lembra a última turma aberta para a tela inicial.
    document.cookie = `adt_turma=${value.classId}; path=/; max-age=31536000; samesite=lax`;
  }, [value.classId]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useClass() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useClass fora de ClassProvider");
  return c;
}

export const canCreate = (role: string) => role === "ADMIN" || role === "MEMBRO";
