import { SearchView } from "@/components/search-view";
import { pageClass } from "@/server/page";
import { listEvents } from "@/server/events/service";

export default async function BuscaPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const { user } = await pageClass(classId);
  return <SearchView events={await listEvents(user.id, classId)} />;
}
