import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold tracking-tighter">
            ION<span className="text-primary">tix</span>
          </span>
        </Link>

        {/* Menu Tengah (Desktop) */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/events"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Kalender Event
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Harga & Layanan
          </Link>
          <Link
            href="/features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Fitur EO
          </Link>
        </nav>

        {/* Tombol Aksi Kanan */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="hidden sm:inline-flex font-semibold"
          >
            Masuk
          </Button>
          <Button className="font-semibold">Daftar Sekarang</Button>
        </div>
      </div>
    </header>
  );
}
