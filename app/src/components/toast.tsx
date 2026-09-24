"use client";
// Toast: faixa tinta 16px acima da barra inferior, some após 2,2s (handoff › Interações).
// flashNext guarda a mensagem para exibi-la depois de uma navegação.
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const Ctx = createContext<(msg: string) => void>(() => {});
const KEY = "adt_toast";

export function flashNext(msg: string) {
  try {
    sessionStorage.setItem(KEY, msg);
  } catch {}
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pathname = usePathname();

  const show = useCallback((m: string) => {
    clearTimeout(timer.current);
    setMsg(m);
    timer.current = setTimeout(() => setMsg(""), 2200);
  }, []);

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(KEY);
      if (pending) {
        sessionStorage.removeItem(KEY);
        show(pending);
      }
    } catch {}
  }, [pathname, show]);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(100px+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4">
        {msg && <div className="w-full max-w-[448px] bg-ink px-4 py-3.5 text-[15px] font-semibold text-bg shadow-md [animation:toast-in_.18s_ease-out]">{msg}</div>}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
