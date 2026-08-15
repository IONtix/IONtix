import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Fungsi untuk membuat koneksi baru
const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in environment variables.");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
};

// Deklarasi global untuk menampung instance Prisma di environment Node.js
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
}

// Gunakan instance yang sudah ada di global, atau buat baru jika belum ada
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// Simpan ke global saat mode development agar tidak bocor saat Next.js Hot Reload
if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
