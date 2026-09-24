import { ClassesView } from "@/components/classes-view";
import { pageUser } from "@/server/page";
import { canCreateClass, listClasses } from "@/server/classes/service";

export const dynamic = "force-dynamic";

export default async function TurmasPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const user = await pageUser();
  const classes = await listClasses(user.id);
  const { codigo } = await searchParams;
  return <ClassesView userName={user.name} classes={classes} initialCode={codigo?.slice(0, 40) ?? ""} canCreate={canCreateClass(user.email)} />;
}
