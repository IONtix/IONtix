import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface SuccessPageProps {
  searchParams: Promise<{
    event?: string;
  }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { event } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/50 bg-card p-6 text-center shadow-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl text-primary">
          🎉
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">
            Pesanan Berhasil Dibuat!
          </h1>

          <p className="text-sm text-muted-foreground">
            Pesanan Anda untuk event{" "}
            <span className="font-semibold text-foreground">
              {event || "Event IONtix"}
            </span>{" "}
            telah berhasil dibuat.
          </p>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Status tiket dan pembayaran dapat diperiksa setelah proses
            pembayaran dikonfirmasi oleh sistem.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full font-bold text-xs">
              Kembali ke Beranda
            </Button>
          </Link>

          <Link href="/cek-tiket" className="w-full">
            <Button className="w-full font-bold text-xs">Cek Tiket</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
