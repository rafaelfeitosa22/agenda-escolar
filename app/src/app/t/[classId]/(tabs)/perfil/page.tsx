import { ProfileView } from "@/components/profile-view";
import { pageClass } from "@/server/page";
import { listClasses } from "@/server/classes/service";

export default async function PerfilPage({ params }: { params: Promise<{ classId: string }> }) {
  const { user } = await pageClass((await params).classId);
  const classes = await listClasses(user.id);
  return <ProfileView user={{ name: user.name, email: user.email }} classes={classes} />;
}
