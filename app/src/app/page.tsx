import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { pageUser } from "@/server/page";
import { listClasses } from "@/server/classes/service";

export const dynamic = "force-dynamic";

// Entrada: vai direto para a turma usada por último (ou a primeira ativa).
export default async function Home() {
  const user = await pageUser();
  const classes = (await listClasses(user.id)).filter((c) => c.status === "ativo");
  const last = (await cookies()).get("adt_turma")?.value;
  const target = classes.find((c) => c.id === last) ?? classes[0];
  redirect(target ? `/t/${target.id}/hoje` : "/turmas");
}
