"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface ETicketProps {
  orderId: string;
  fullName: string;
  eventTitle: string;
  ticketName: string;
  jerseySize: string;
  location: string;
  date: string;
}

export default function ETicketCard({
  orderId,
  fullName,
  eventTitle,
  ticketName,
  jerseySize,
  location,
  date,
}: ETicketProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(orderId, { width: 300, margin: 2 })
      .then((url) => setQrCodeUrl(url))
      .catch((error) => console.error("Error generating QR code:", error));
  }, [orderId]);

  return (
    <div className="my-4 w-full overflow-hidden rounded-3xl border-2 border-primary/20 bg-card text-left shadow-lg">
      {/* Header Tiket */}
      <div className="bg-primary p-5 text-center text-primary-foreground">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest opacity-80">
          Official E-Ticket
        </div>

        <h2 className="text-xl font-black tracking-tight">{eventTitle}</h2>

        <span className="mt-2 inline-block rounded-full bg-background/20 px-3 py-0.5 text-xs font-semibold text-primary-foreground">
          {ticketName}
        </span>
      </div>

      {/* Body Tiket */}
      <div className="space-y-5 p-6">
        {/* Display QR Code */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-muted/30 p-4">
          {qrCodeUrl ? (
            <Image
              src={qrCodeUrl}
              alt="E-Ticket QR Code"
              width={160}
              height={160}
              unoptimized
              className="h-40 w-40 rounded-lg border bg-white p-2 shadow-sm"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground animate-pulse">
              Memuat QR Code...
            </div>
          )}

          <p className="mt-2 font-mono text-[10px] tracking-widest text-muted-foreground">
            ID: {orderId}
          </p>
        </div>

        {/* Detail Peserta */}
        <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-4 text-xs">
          <div>
            <p className="text-muted-foreground">Nama Pelari</p>
            <p className="text-sm font-bold text-foreground">{fullName}</p>
          </div>

          <div>
            <p className="text-muted-foreground">Ukuran Jersey</p>
            <p className="text-sm font-bold text-foreground">{jerseySize}</p>
          </div>

          <div>
            <p className="text-muted-foreground">Lokasi</p>
            <p className="font-medium text-foreground">{location}</p>
          </div>

          <div>
            <p className="text-muted-foreground">Tanggal Event</p>
            <p className="font-medium text-foreground">{date}</p>
          </div>
        </div>
      </div>

      {/* Footer Tiket */}
      <div className="border-t border-dashed border-border bg-muted/50 p-3 text-center text-[11px] text-muted-foreground">
        Tunjukkan QR Code ini kepada panitia saat pengambilan Racepack.
      </div>
    </div>
  );
}
