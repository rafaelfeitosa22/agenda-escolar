// Cria uma migração PostgreSQL a partir das mudanças em prisma/schema.prisma, sem precisar de banco:
// compara com o snapshot da última migração (prisma/migrations/schema.snapshot.prisma).
// Uso: npm run db:migration -- nome_da_mudanca
// Na Vercel, `prisma migrate deploy` aplica as migrações pendentes no Supabase a cada deploy.
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const name = (process.argv[2] || "alteracao").toLowerCase().replace(/[^a-z0-9_]+/g, "_");
const dir = "prisma/migrations";
const snapshot = path.join(dir, "schema.snapshot.prisma");
const from = existsSync(snapshot) ? ["--from-schema-datamodel", snapshot] : ["--from-empty"];

// Comando fixo (sem entrada do usuário).
const sql = execSync(`npx prisma migrate diff ${from.join(" ")} --to-schema-datamodel prisma/schema.prisma --script`, { encoding: "utf8" });

if (!sql.trim() || /This is an empty migration/.test(sql)) {
  console.log("Nenhuma mudança no schema — nada a migrar.");
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const out = path.join(dir, `${stamp}_${name}`);
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "migration.sql"), sql);
writeFileSync(path.join(dir, "migration_lock.toml"), '# Gerado pelo Prisma. Não edite.\nprovider = "postgresql"\n');
copyFileSync("prisma/schema.prisma", snapshot);
console.log(`Migração criada: ${out}/migration.sql`);
console.log('Se criou tabela nova, acrescente no fim: ALTER TABLE "nome" ENABLE ROW LEVEL SECURITY;');
