"use client";

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
      .catch((err) => console.error("Error generating QR code:", err));
  }, [orderId]);

  return (
    <div className="w-full bg-card border-2 border-primary/20 rounded-3xl overflow-hidden shadow-lg my-4 text-left">
      {/* Header Tiket */}
      <div className="bg-primary p-5 text-primary-foreground text-center">
        <div className="text-[10px] uppercase tracking-widest font-bold opacity-80 mb-1">
          Official E-Ticket
        </div>
        <h2 className="text-xl font-black tracking-tight">{eventTitle}</h2>
        <span className="inline-block mt-2 bg-background/20 text-primary-foreground px-3 py-0.5 rounded-full text-xs font-semibold">
          {ticketName}
        </span>
      </div>

      {/* Body Tiket */}
      <div className="p-6 space-y-5">
        {/* Display QR Code */}
        <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-2xl border border-border/50">
          {qrCodeUrl ? (
            // eslint-disable-next-ok-img-element
            <img
              src={qrCodeUrl}
              alt="E-Ticket QR Code"
              className="w-40 h-40 rounded-lg shadow-sm border bg-white p-2"
            />
          ) : (
            <div className="w-40 h-40 bg-muted animate-pulse rounded-lg flex items-center justify-center text-xs text-muted-foreground">
              Memuat QR Code...
            </div>
          )}
          <p className="text-[10px] text-muted-foreground font-mono mt-2 tracking-widest">
            ID: {orderId}
          </p>
        </div>

        {/* Detail Peserta */}
        <div className="grid grid-cols-2 gap-3 text-xs border-t border-border/40 pt-4">
          <div>
            <p className="text-muted-foreground">Nama Pelari</p>
            <p className="font-bold text-foreground text-sm">{fullName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ukuran Jersey</p>
            <p className="font-bold text-foreground text-sm">{jerseySize}</p>
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
      <div className="bg-muted/50 p-3 text-center border-t border-dashed border-border text-[11px] text-muted-foreground">
        Tunjukkan QR Code ini kepada panitia saat pengambilan Racepack.
      </div>
    </div>
  );
}
