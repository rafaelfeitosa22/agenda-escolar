import { ClassProvider } from "@/components/class-context";
import { pageClass } from "@/server/page";
import { todayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ClassLayout({ children, params }: { children: React.ReactNode; params: Promise<{ classId: string }> }) {
  const { user, cls } = await pageClass((await params).classId);
  return (
    <ClassProvider
      value={{
        classId: cls.id,
        name: cls.name,
        school: cls.school,
        emoji: cls.emoji,
        role: cls.role as "ADMIN" | "MEMBRO" | "VISUALIZADOR",
        user: { id: user.id, name: user.name },
        today: todayKey(),
      }}
    >
      <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-bg min-[481px]:border-x-2 min-[481px]:border-ink">{children}</div>
    </ClassProvider>
  );
}
