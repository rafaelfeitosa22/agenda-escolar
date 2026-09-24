import { MembersView } from "@/components/members-view";
import { pageClass } from "@/server/page";
import { listMembers } from "@/server/classes/service";

export default async function MembrosPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const { user, cls } = await pageClass(classId);
  const members = await listMembers(user.id, classId);
  return (
    <MembersView
      inviteCode={cls.inviteCode ?? null}
      members={members.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString(), me: m.userId === user.id }))}
    />
  );
}
