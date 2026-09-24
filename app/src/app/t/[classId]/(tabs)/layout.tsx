import { BottomNav, ClassHeader, ScrollArea } from "@/components/shell";
import { pageUser } from "@/server/page";
import { unreadCount } from "@/server/notifications/service";

export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser();
  const unread = await unreadCount(user.id);
  return (
    <>
      <ClassHeader />
      <ScrollArea>{children}</ScrollArea>
      <BottomNav unread={unread} />
    </>
  );
}
