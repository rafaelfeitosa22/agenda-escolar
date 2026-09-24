import { BottomNav, ScrollArea } from "@/components/shell";
import { pageUser } from "@/server/page";
import { unreadCount } from "@/server/notifications/service";

// Detalhe: sem o cabeçalho da turma, mas com a barra inferior (handoff › Telas › 3).
export default async function DetailLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser();
  return (
    <>
      <ScrollArea>{children}</ScrollArea>
      <BottomNav unread={await unreadCount(user.id)} />
    </>
  );
}
