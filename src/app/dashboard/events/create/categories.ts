import { Footprints, Waves, Layers, Bike } from "lucide-react";

export const EVENT_CATEGORIES = [
  {
    slug: "lari", // Pastikan slug ini persis dengan nama belakang file EventForm[Lari].tsx
    title: "Lari / Maraton",
    description:
      "Form otomatis terisi opsi Ukuran Jersey, Nama BIB, dan Jarak Lari.",
    icon: Footprints,
    color: "from-blue-600 to-indigo-600",
    badge: "Populer",
  },
  {
    slug: "renang",
    title: "Renang / Open Water",
    description: "Form disesuaikan untuk Gaya Renang dan Panjang Lintasan.",
    icon: Waves,
    color: "from-cyan-600 to-blue-600",
  },
  {
    slug: "sepeda",
    title: "Sepeda / Gran Fondo",
    description: "Form disesuaikan untuk tipe sepeda Roadbike / MTB.",
    icon: Bike,
    color: "from-emerald-600 to-teal-600",
  },
  {
    slug: "lainnya",
    title: "Event Lainnya",
    description: "Form umum fleksibel untuk berbagai cabang olahraga.",
    icon: Layers,
    color: "from-slate-700 to-slate-900",
  },
];
