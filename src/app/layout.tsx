import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Konfigurasi Font Ultra Premium
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IONtix | Premium Ticketing Platform",
  description:
    "Platform manajemen tiket eksklusif dan andal untuk Event Organizer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Menambahkan variabel font dan antialiased pada tag HTML
    <html lang="id" className={`${plusJakartaSans.variable} antialiased`}>
      <body className="font-sans bg-slate-50 text-slate-900 min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
