// Gera prisma/sqlite/schema.prisma a partir do schema oficial (PostgreSQL) para dev local e testes.
// O Prisma não troca de provider por variável de ambiente, então mantemos uma cópia gerada.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

let s = readFileSync("prisma/schema.prisma", "utf8");
s = s
  .replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"')
  .replace(/^\s*directUrl\s*=.*$/m, "")
  .replace(/^\s*\/\/ Supabase:.*$/m, "");

mkdirSync("prisma/sqlite", { recursive: true });
writeFileSync(
  "prisma/sqlite/schema.prisma",
  "// ARQUIVO GERADO por scripts/sqlite-schema.mjs — não edite. Fonte: prisma/schema.prisma\n\n" + s,
);
console.log("prisma/sqlite/schema.prisma gerado");
