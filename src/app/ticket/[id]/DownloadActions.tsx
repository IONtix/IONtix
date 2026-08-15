"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toJpeg, toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export default function DownloadActions({ ticketId }: { ticketId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingType, setLoadingType] = useState<"jpg" | "pdf" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menutup menu jika mengklik di luar area tombol
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDownload = async (format: "jpg" | "pdf") => {
    setLoadingType(format);
    setIsOpen(false);

    try {
      const ticketElement = document.getElementById("ticket-node");
      if (!ticketElement) {
        alert("Elemen tiket tidak ditemukan.");
        setLoadingType(null);
        return;
      }

      // Konfigurasi render resolusi tinggi
      const options = {
        pixelRatio: 2,
        backgroundColor: "#050A14",
        cacheBust: true,
      };

      const filename = `IONTIX-PASS-${ticketId.slice(-6).toUpperCase()}`;

      if (format === "jpg") {
        // Render langsung ke JPEG
        const dataUrl = await toJpeg(ticketElement, {
          ...options,
          quality: 0.95,
        });
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${filename}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === "pdf") {
        // Render ke PNG kualitas tinggi untuk disisipkan ke dalam PDF
        const dataUrl = await toPng(ticketElement, options);

        // Buat elemen image sementara untuk mendapatkan dimensi asli
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => (img.onload = resolve));

        const pdf = new jsPDF({
          orientation: img.width > img.height ? "landscape" : "portrait",
          unit: "px",
          format: [img.width, img.height],
        });

        pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
        pdf.save(`${filename}.pdf`);
      }
    } catch (error) {
      console.error("Gagal mengunduh tiket:", error);
      alert(
        "Terjadi kesalahan teknis saat mengunduh. Cek console browser untuk detail.",
      );
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="relative w-full" ref={menuRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loadingType !== null}
        className="w-full py-5 sm:py-6 rounded-2xl font-black text-xs tracking-[0.2em] bg-linear-to-r from-[#F57C00] via-amber-500 to-[#E65100] hover:opacity-95 text-white shadow-xl shadow-orange-500/20 transition-all uppercase flex items-center justify-center gap-2 border border-orange-400/30"
      >
        <span>
          {loadingType
            ? `MEMPROSES ${loadingType.toUpperCase()}...`
            : "UNDUH E-TIKET RESMI"}
        </span>
        {!loadingType && (
          <span
            className={`transition-transform duration-300 text-[10px] ${isOpen ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-3 bg-[#0D1527] border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 py-2 border-b border-slate-800">
            PILIH FORMAT UNDUHAN
          </div>
          <button
            onClick={() => handleDownload("jpg")}
            className="w-full text-left px-3 py-3 rounded-xl hover:bg-slate-800/80 transition flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-black text-white group-hover:text-amber-400 transition">
                FORMAT GAMBAR (JPG)
              </p>
              <p className="text-[10px] text-slate-400">
                Cocok disebarkan atau disimpan di galeri HP
              </p>
            </div>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              HIGH RES
            </span>
          </button>

          <button
            onClick={() => handleDownload("pdf")}
            className="w-full text-left px-3 py-3 rounded-xl hover:bg-slate-800/80 transition flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-black text-white group-hover:text-amber-400 transition">
                DOKUMEN CETAK (PDF)
              </p>
              <p className="text-[10px] text-slate-400">
                1 Halaman pas presisi siap cetak
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
              READY PRINT
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
