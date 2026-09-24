// Cria um banco de testes novo (SQLite descartável, separado do dev.db) antes da suíte.
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

export default function setup() {
  // DATABASE_URL "file:../test.db" é relativo a prisma/sqlite/ (schema SQLite gerado).
  for (const f of ["test.db", "test.db-journal"]) rmSync(path.join(__dirname, "..", "prisma", f), { force: true });
  execSync("npx prisma db push --skip-generate --schema prisma/sqlite/schema.prisma", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:../test.db", PRISMA_HIDE_UPDATE_MESSAGE: "1" },
  });
}
