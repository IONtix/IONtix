import prisma from "@/lib/prisma";
import EOTable from "./_components/EOTable";
import { Building2 } from "lucide-react";

export const metadata = {
  title: "Manajemen Mitra EO | IONtix Admin",
};

export default async function EOPage() {
  // Mengambil data pengguna HANYA yang memiliki Role "EO"
  const eoUsers = await prisma.user.findMany({
    where: {
      role: { name: { equals: "EO", mode: "insensitive" } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-[1600px] mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200/60 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600 drop-shadow-sm" />
            Manajemen Mitra EO
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Pantau dan kelola seluruh daftar Mitra Event Organizer (EO) yang
            tergabung di platform IONtix.
          </p>
        </div>
      </div>

      {/* Tabel Interaktif */}
      <EOTable initialData={eoUsers} />
    </div>
  );
}
