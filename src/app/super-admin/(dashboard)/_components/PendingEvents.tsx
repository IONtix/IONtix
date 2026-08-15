// src/app/super-admin/_components/PendingEvents.tsx

import { ArrowUpRight } from "lucide-react";
import { approveEvent } from "../actions";

export default function PendingEvents({
  pendingEvents,
}: {
  pendingEvents: any[];
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Event Pending</h3>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-600 border border-red-200">
          {pendingEvents.length} Pending
        </span>
      </div>

      <div className="space-y-4 flex-1">
        {pendingEvents.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-8">
            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <span className="text-slate-300 text-2xl">✓</span>
            </div>
            <p className="text-sm font-medium text-slate-500">
              Semua event sudah ditinjau.
            </p>
          </div>
        ) : (
          pendingEvents.map((event) => (
            <div
              key={event.id}
              className="group flex items-start justify-between rounded-xl border border-slate-100 p-4 transition-all hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold uppercase ring-2 ring-white shadow-sm">
                  {event.title ? event.title.charAt(0) : "E"}
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                    {event.title}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    EO:{" "}
                    <span className="font-medium text-slate-600">
                      {event.eo?.name || "Tidak Diketahui"}
                    </span>
                  </p>
                </div>
              </div>
              <form action={approveEvent.bind(null, event.id)}>
                <button
                  type="submit"
                  title="Setujui Event Ini"
                  className="rounded-lg p-2 shrink-0 text-slate-400 transition-all hover:bg-emerald-100 hover:text-emerald-700 hover:shadow-sm"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          ))
        )}
      </div>

      <button className="mt-6 w-full rounded-xl bg-slate-50 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 border border-slate-200">
        Tinjau Semua Event
      </button>
    </div>
  );
}
