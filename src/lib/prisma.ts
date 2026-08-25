import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in environment variables.");
  }

  const isProduction =
    process.env.NODE_ENV === "production";

  /*
   * Pada development/E2E, jangan biarkan parameter SSL
   * dari DATABASE_URL mengambil alih konfigurasi ssl
   * pada pg Pool.
   *
   * Production tetap menggunakan DATABASE_URL asli.
   */
  let poolConnectionString = connectionString;

  if (!isProduction) {
    try {
      const url = new URL(
        connectionString,
      );

      url.searchParams.delete("sslmode");
      url.searchParams.delete("ssl");
      url.searchParams.delete("sslcert");
      url.searchParams.delete("sslkey");
      url.searchParams.delete("sslrootcert");

      poolConnectionString =
        url.toString();
    } catch {
      throw new Error(
        "DATABASE_URL tidak valid.",
      );
    }
  }

  const pool =
    globalForPrisma.prismaPool ??
    new Pool({
      connectionString:
        poolConnectionString,
      max: isProduction ? 10 : 5,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,

      /*
       * Development/E2E:
       * tetap menggunakan TLS, tetapi tidak mewajibkan
       * certificate chain lokal dipercaya.
       *
       * Production:
       * gunakan default certificate verification.
       */
      ssl: isProduction
        ? undefined
        : {
            rejectUnauthorized: false,
          },
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaPool = pool;
  }

  return new PrismaClient({
    adapter: new PrismaPg(pool),
  });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
