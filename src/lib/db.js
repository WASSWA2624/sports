import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis;
const adapter = new PrismaMariaDb(process.env.DATABASE_URL);

export const db =
  globalForPrisma.__sportsPrisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__sportsPrisma = db;
}
