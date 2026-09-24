// Armazenamento privado das fotos da agenda.
// STORAGE_DRIVER=local (padrão, dev): disco fora de /public.
// STORAGE_DRIVER=supabase (produção): bucket PRIVADO no Supabase Storage, acessado só pelo servidor
// com a service role key. O navegador nunca recebe URL do bucket: as fotos passam por
// /api/images/{id}, que confere se quem pede é membro da turma.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/server/http";

export const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB || 8) * 1024 * 1024;
const ALLOWED = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export type AllowedMime = keyof typeof ALLOWED;

/** Confere o tipo pelo conteúdo (assinatura do arquivo), não pelo nome ou pelo cabeçalho enviado. */
export function sniffMime(buf: Buffer): AllowedMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export function validateImage(buf: Buffer): AllowedMime {
  if (buf.length === 0) throw new ApiError(400, "arquivo_vazio", "Nenhuma foto recebida.");
  if (buf.length > MAX_BYTES) throw new ApiError(413, "arquivo_grande", `A foto é maior que ${process.env.MAX_UPLOAD_MB || 8} MB.`);
  const mime = sniffMime(buf);
  if (!mime) throw new ApiError(415, "tipo_invalido", "Envie uma foto em JPG, PNG ou WEBP.");
  return mime;
}

interface ImageStore {
  save(key: string, buf: Buffer, mime: AllowedMime): Promise<void>;
  read(key: string): Promise<Buffer>;
}

const localStore: ImageStore = {
  async save(key, buf) {
    const full = path.join(/*turbopackIgnore: true*/ localRoot(), key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buf);
  },
  async read(key) {
    const root = localRoot();
    const full = path.resolve(/*turbopackIgnore: true*/ root, key);
    if (!full.startsWith(root + path.sep)) throw new ApiError(400, "caminho_invalido", "Arquivo inválido.");
    return readFile(full);
  },
};

function localRoot() {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./storage/uploads");
}

function supabaseStore(): ImageStore {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || "agenda-fotos";
  if (!base || !key) throw new Error("STORAGE_DRIVER=supabase exige SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  const auth = { Authorization: `Bearer ${key}`, apikey: key };
  let ensured: Promise<void> | null = null;

  // Cria o bucket privado na primeira gravação, se ainda não existir.
  const ensureBucket = () =>
    (ensured ??= fetch(`${base}/storage/v1/bucket`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id: bucket, name: bucket, public: false, file_size_limit: MAX_BYTES, allowed_mime_types: Object.keys(ALLOWED) }),
    }).then(async (r) => {
      if (!r.ok && r.status !== 409 && !/already exists/i.test(await r.text())) {
        ensured = null;
        throw new Error(`Supabase Storage: não foi possível criar o bucket (${r.status}).`);
      }
    }));

  const url = (k: string) => `${base}/storage/v1/object/${bucket}/${k.split("/").map(encodeURIComponent).join("/")}`;

  return {
    async save(k, buf, mime) {
      await ensureBucket();
      const r = await fetch(url(k), { method: "POST", headers: { ...auth, "Content-Type": mime, "x-upsert": "false" }, body: new Uint8Array(buf) });
      if (!r.ok) throw new Error(`Supabase Storage: falha ao enviar a foto (${r.status}).`);
    },
    async read(k) {
      const r = await fetch(url(k), { headers: auth, cache: "no-store" });
      if (r.status === 404 || r.status === 400) throw new ApiError(404, "nao_encontrado", "Foto não encontrada.");
      if (!r.ok) throw new Error(`Supabase Storage: falha ao ler a foto (${r.status}).`);
      return Buffer.from(await r.arrayBuffer());
    },
  };
}

let store: ImageStore | null = null;
const getStore = () => (store ??= process.env.STORAGE_DRIVER === "supabase" ? supabaseStore() : localStore);

export async function saveImage(classId: string, buf: Buffer, mime: AllowedMime) {
  // O nome é gerado aqui; nada vindo do cliente entra no caminho.
  const key = `${classId.replace(/[^a-z0-9]/gi, "")}/${randomUUID()}.${ALLOWED[mime]}`;
  await getStore().save(key, buf, mime);
  return key;
}

export async function readImage(storagePath: string) {
  return getStore().read(storagePath);
}
