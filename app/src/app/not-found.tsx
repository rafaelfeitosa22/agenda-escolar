import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-4 bg-bg px-5 pt-16">
      <span className="kicker text-accent-700">Não encontrado</span>
      <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.015em]">Esta página não existe ou você não tem acesso a ela.</h1>
      <p className="text-[15px] text-neutral-700">A agenda de cada turma é visível só para quem participa dela.</p>
      <Link href="/" className="flex h-[52px] items-center bg-accent px-4 text-base font-extrabold text-bg hover:bg-accent-600">
        Ir para o início
      </Link>
    </main>
  );
}
