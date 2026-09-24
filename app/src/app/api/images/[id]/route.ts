// Foto original da agenda: só membros ativos da turma dona da imagem podem ver.
import { prisma } from "@/server/db";
import { notFound, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { activeMembership } from "@/server/classes/access";
import { readImage } from "@/server/storage/images";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const upload = await prisma.upload.findUnique({ where: { id: (await params).id } });
  if (!upload || !(await activeMembership(user.id, upload.classId))) throw notFound();
  const data = await readImage(upload.storagePath);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": upload.mimeType,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline",
    },
  });
});
