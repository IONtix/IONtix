"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateParticipantStatus } from "@/app/actions/event";
import type { OrderRow, JsonObject } from "@/lib/platform-types";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Package,
} from "lucide-react";

export default function OrdersClient({ orders }: { orders: OrderRow[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusChange = async (
    orderId: string,
    status: "APPROVED" | "REJECTED",
  ) => {
    if (!confirm(`Apakah Anda yakin ingin mengubah status menjadi ${status}?`))
      return;

    setLoadingId(orderId);
    const res = await updateParticipantStatus(orderId, status);
    setLoadingId(null);

    if (!res.success) {
      alert(res.error);
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] font-bold tracking-wider border-b border-border/50">
            <tr>
              <th className="p-4">Peserta</th>
              <th className="p-4">Kategori Tiket</th>
              <th className="p-4">Kualifikasi / Custom Fields</th>
              <th className="p-4">Add-ons</th>
              <th className="p-4">Status Approval</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-muted-foreground"
                >
                  Belum ada peserta yang mendaftar di event ini.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const customAnswers =
                  (order.customAnswers as JsonObject) || {};

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    {/* Data Peserta */}
                    <td className="p-4 font-medium">
                      <div className="font-bold text-foreground">
                        {order.fullName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.phone}
                      </div>
                    </td>

                    {/* Kategori Tiket */}
                    <td className="p-4">
                      <span className="font-semibold">
                        {order.categoryName}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        Size: {order.jerseySize}
                      </div>
                    </td>

                    {/* Jawaban Custom Fields / Strava Link */}
                    <td className="p-4 max-w-xs">
                      {Object.keys(customAnswers).length > 0 ? (
                        <div className="space-y-1 text-xs">
                          {Object.entries(customAnswers).map(
                            ([key, value]: [string, unknown]) => (
                              <div key={key} className="truncate">
                                <span className="font-semibold text-muted-foreground">
                                  {key}:{" "}
                                </span>
                                {typeof value === "string" &&
                                value.startsWith("http") ? (
                                  <a
                                    href={value}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline inline-flex items-center gap-1 font-bold"
                                  >
                                    Cek Bukti <ExternalLink size={11} />
                                  </a>
                                ) : (
                                  <span>{String(value)}</span>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          - Tidak ada -
                        </span>
                      )}
                    </td>

                    {/* Modul Add-ons */}
                    <td className="p-4">
                      {order.addonOrders && order.addonOrders.length > 0 ? (
                        <div className="space-y-1">
                          {order.addonOrders?.map((ao) => (
                            <div
                              key={ao.id}
                              className="text-xs flex items-center gap-1.5 font-medium"
                            >
                              <Package size={12} className="text-primary" />
                              <span>{ao.addon.name}</span>
                              <span className="text-muted-foreground">
                                x{ao.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          -
                        </span>
                      )}
                    </td>

                    {/* Status Approval */}
                    <td className="p-4">
                      {order.approvalStatus === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold px-2.5 py-1 rounded-full">
                          <CheckCircle2 size={13} /> Approved
                        </span>
                      )}
                      {order.approvalStatus === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold px-2.5 py-1 rounded-full">
                          <XCircle size={13} /> Rejected
                        </span>
                      )}
                      {(order.approvalStatus === "PENDING" ||
                        order.approvalStatus === "NONE") && (
                        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full">
                          <Clock size={13} /> Pending Review
                        </span>
                      )}
                    </td>

                    {/* Tombol Aksi */}
                    <td className="p-4 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-green-500/30 text-green-600 hover:bg-green-500/10"
                        disabled={
                          loadingId === order.id ||
                          order.approvalStatus === "APPROVED"
                        }
                        onClick={() => handleStatusChange(order.id, "APPROVED")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-red-500/30 text-red-600 hover:bg-red-500/10"
                        disabled={
                          loadingId === order.id ||
                          order.approvalStatus === "REJECTED"
                        }
                        onClick={() => handleStatusChange(order.id, "REJECTED")}
                      >
                        Reject
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
