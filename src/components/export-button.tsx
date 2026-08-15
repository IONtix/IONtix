"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OrderExportData {
  fullName: string;
  email: string;
  phone: string;
  categoryName: string;
  jerseySize: string;
  isClaimed: boolean;
  createdAt: Date;
}

interface ExportButtonProps {
  orders: OrderExportData[];
  eventTitle: string;
}

export default function ExportButton({
  orders,
  eventTitle,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Format nama file agar rapi
  const getFileName = (ext: string) =>
    `Daftar_Peserta_${eventTitle.replace(/\s+/g, "_")}.${ext}`;

  // Menutup menu jika mengklik di luar tombol
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🟢 Fungsi Download Excel (.xlsx)
  const handleDownloadExcel = () => {
    if (orders.length === 0) return;

    const data = orders.map((order) => ({
      "Nama Pelari": order.fullName,
      Email: order.email,
      "No HP": order.phone,
      "Kategori Tiket": order.categoryName,
      "Ukuran Jersey": order.jerseySize,
      "Status Racepack": order.isClaimed ? "Sudah Ambil" : "Belum Ambil",
      "Tanggal Daftar": new Date(order.createdAt).toLocaleDateString("id-ID"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Peserta");

    XLSX.writeFile(workbook, getFileName("xlsx"));
    setIsOpen(false);
  };

  // 🔴 Fungsi Download PDF (.pdf)
  const handleDownloadPDF = () => {
    if (orders.length === 0) return;

    const doc = new jsPDF("landscape");

    doc.setFontSize(16);
    doc.text(`Daftar Peserta: ${eventTitle}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Diunduh pada: ${new Date().toLocaleDateString("id-ID")}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [
        [
          "Nama Pelari",
          "Email",
          "No HP",
          "Kategori Tiket",
          "Ukuran Jersey",
          "Status Racepack",
          "Tanggal Daftar",
        ],
      ],
      body: orders.map((order) => [
        order.fullName,
        order.email,
        order.phone,
        order.categoryName,
        order.jerseySize,
        order.isClaimed ? "Sudah Ambil" : "Belum Ambil",
        new Date(order.createdAt).toLocaleDateString("id-ID"),
      ]),
      headStyles: { fillColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });

    doc.save(getFileName("pdf"));
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Tombol Utama */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="font-bold border-border shadow-sm text-xs flex items-center gap-2"
      >
        <span>📥 Download Data</span>
        <span className="text-[10px] opacity-60">▼</span>
      </Button>

      {/* Menu Pilihan Format (Dropdown) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-card border border-border shadow-xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95">
          <button
            onClick={handleDownloadExcel}
            className="w-full text-left px-3 py-2.5 text-xs font-semibold rounded-xl hover:bg-muted flex items-center gap-2.5 transition-colors"
          >
            <span className="text-base">📊</span>
            <div>
              <p className="text-foreground font-bold">Excel (.xlsx)</p>
              <p className="text-[10px] text-muted-foreground font-normal">
                Format tabel terpisah & rapi
              </p>
            </div>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="w-full text-left px-3 py-2.5 text-xs font-semibold rounded-xl hover:bg-muted flex items-center gap-2.5 transition-colors"
          >
            <span className="text-base">📄</span>
            <div>
              <p className="text-foreground font-bold">Dokumen PDF (.pdf)</p>
              <p className="text-[10px] text-muted-foreground font-normal">
                Siap cetak A4 Lanskap
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
