import { notFound } from "next/navigation";
import { PhotoFlow } from "@/components/photo-flow";
import { pageClass } from "@/server/page";

export default async function PhotoPage({ params }: { params: Promise<{ classId: string }> }) {
  const { cls } = await pageClass((await params).classId);
  if (cls.role === "VISUALIZADOR") notFound();
  return <PhotoFlow />;
}
