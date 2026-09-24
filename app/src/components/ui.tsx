"use client";
// Peças básicas no sistema Modernist: botões alinhados à esquerda, sheet, diálogo, barra de voltar.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { IconArrowRight, IconChevronLeft } from "./icons";

type Variant = "primary" | "outline" | "danger" | "dangerSolid" | "ink";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-bg hover:bg-accent-600 active:bg-accent-700 disabled:bg-neutral-400",
  outline: "border-2 border-ink bg-transparent hover:bg-surface disabled:opacity-50",
  danger: "border-2 border-accent-700 text-accent-700 bg-transparent hover:bg-accent-100 disabled:opacity-50",
  dangerSolid: "bg-accent-700 text-bg hover:bg-accent-800 disabled:opacity-50",
  ink: "bg-ink text-bg hover:bg-neutral-800 disabled:opacity-50",
};

export function Button({
  variant = "outline",
  arrow,
  className = "",
  size = "md",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; arrow?: boolean; size?: "md" | "lg" }) {
  return (
    <button
      {...rest}
      className={`flex w-full items-center gap-2.5 px-4 text-left font-extrabold ${size === "lg" ? "h-[52px] text-base" : "h-12 text-[15px]"} ${VARIANT[variant]} ${className}`}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {arrow && <IconArrowRight size={20} stroke={2.4} />}
    </button>
  );
}

export function SectionHead({ children, right, className = "" }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-baseline justify-between border-b-2 border-ink px-5 pb-2.5 ${className}`}>
      <span className="label-section">{children}</span>
      {right}
    </div>
  );
}

export function BackBar({ href, label = "Voltar", right, onBack }: { href?: string; label?: string; right?: ReactNode; onBack?: () => void }) {
  const router = useRouter();
  const cls = "flex h-11 items-center gap-1 px-2 text-base font-semibold";
  return (
    <div className="flex flex-none items-center justify-between border-b-2 border-divider pt-1 pr-3 pb-2 pl-2">
      {href ? (
        <Link href={href} className={cls}>
          <IconChevronLeft size={20} stroke={2.4} />
          {label}
        </Link>
      ) : (
        <button type="button" onClick={onBack ?? (() => (history.length > 1 ? router.back() : router.push("/")))} className={cls}>
          <IconChevronLeft size={20} stroke={2.4} />
          {label}
        </button>
      )}
      {right}
    </div>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[color-mix(in_srgb,var(--color-ink)_45%,transparent)] [animation:fade-in_.15s]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[480px] flex-col gap-2.5 border-t-2 border-ink bg-bg px-5 pt-5 pb-[calc(36px+env(safe-area-inset-bottom))] [animation:sheet-in_.2s_ease-out]"
      >
        <span className="text-[22px] font-extrabold">{title}</span>
        {children}
      </div>
    </div>
  );
}

export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-ink)_45%,transparent)] p-6 [animation:fade-in_.15s]" onClick={onClose}>
      <div role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="flex w-full max-w-[420px] flex-col gap-2 bg-bg p-[22px] shadow-lg">
        <span className="text-xl leading-tight font-extrabold">{title}</span>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children, highlight }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; highlight?: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-2">
        <span className="kicker">{label}</span>
        {highlight}
      </span>
      {children}
      {hint && !error && <span className="text-[13px] text-neutral-700">{hint}</span>}
      {error && <span className="text-[13px] font-semibold text-accent-700">{error}</span>}
    </label>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="border-l-4 border-accent-700 bg-accent-100 px-3 py-2.5 text-[15px] font-semibold text-accent-800">
      {children}
    </div>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-10" role="status">
      <span className="text-lg font-extrabold">{label}</span>
      <span className="relative block h-1 overflow-hidden bg-neutral-300">
        <span className="absolute inset-y-0 w-2/5 bg-accent [animation:bar_1.1s_linear_infinite]" />
      </span>
    </div>
  );
}
