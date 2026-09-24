export const dynamic = "force-static";

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-4 bg-bg px-5 pt-16">
      <div className="flex size-10 items-center justify-center bg-accent text-xl text-bg">🌻</div>
      <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.015em]">Sem conexão</h1>
      <p className="text-[15px] text-neutral-700">A agenda precisa de internet para mostrar os compromissos mais recentes da turma. Tente de novo quando a conexão voltar.</p>
    </main>
  );
}
