// src/app/super-admin/_components/RevenueChart.tsx

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

export default function RevenueChart({
  currentYear,
  monthlyData,
  chartHeights,
}: {
  currentYear: number;
  monthlyData: number[];
  chartHeights: number[];
}) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Ags",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-2 transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">
          Tren Pendapatan ({currentYear})
        </h3>
        <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600">
          Auto Sync
        </span>
      </div>

      <div className="mt-8 flex h-64 items-end gap-2 px-2 sm:gap-4">
        {chartHeights.map((height, i) => (
          <div
            key={i}
            className="group relative flex w-full flex-col items-center justify-end"
          >
            {/* Tooltip Hover */}
            <div className="absolute -top-10 hidden rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:block group-hover:opacity-100 whitespace-nowrap z-10 shadow-lg">
              {formatRupiah(monthlyData[i])}
              {/* Segitiga panah ke bawah */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
            </div>

            {/* Batang Grafik */}
            <div
              className={`w-full rounded-t-md transition-all duration-300 group-hover:bg-blue-600 ${
                height > 0 ? "bg-blue-100" : "bg-slate-50"
              }`}
              style={{ height: `${height}%` }}
            ></div>
            <span className="mt-2 text-xs font-medium text-slate-400 group-hover:text-slate-600 group-hover:font-semibold transition-colors">
              {months[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
