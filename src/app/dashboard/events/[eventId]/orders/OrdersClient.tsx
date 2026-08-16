"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { updateParticipantStatus } from "@/app/actions/event";

import type { JsonObject, OrderRow } from "@/lib/platform-types";

import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Package,
} from "lucide-react";

export default function OrdersClient({ orders }: { orders: OrderRow[] }) {
  const [rows, setRows] = useState<OrderRow[]>(orders);

  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusChange = async (
    orderId: string,
    status: "APPROVED" | "REJECTED",
  ) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin mengubah status menjadi ${status}?`,
    );

    if (!confirmed) {
      return;
    }

    setLoadingId(orderId);

    try {
      const result = await updateParticipantStatus(orderId, status);

      if (!result.success) {
        window.alert(result.error ?? "Gagal memperbarui status peserta.");
        return;
      }

      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === orderId
            ? {
                ...row,
                approvalStatus: status,
              }
            : row,
        ),
      );
    } catch (error: unknown) {
      console.error("Gagal memperbarui status peserta:", error);

      window.alert("Terjadi kesalahan saat memperbarui status peserta.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/50 bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-muted-foreground"
                >
                  Belum ada peserta yang mendaftar di event ini.
                </td>
              </tr>
            ) : (
              rows.map((order) => {
                const customAnswers =
                  order.customAnswers &&
                  typeof order.customAnswers === "object" &&
                  !Array.isArray(order.customAnswers)
                    ? (order.customAnswers as JsonObject)
                    : {};

                return (
                  <tr
                    key={order.id}
                    className="transition-colors hover:bg-muted/20"
                  >
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

                    <td className="p-4">
                      <span className="font-semibold">
                        {order.categoryName}
                      </span>

                      <div className="text-xs text-muted-foreground">
                        Size: {order.jerseySize ?? "-"}
                      </div>
                    </td>

                    <td className="max-w-xs p-4">
                      {Object.keys(customAnswers).length > 0 ? (
                        <div className="space-y-1 text-xs">
                          {Object.entries(customAnswers).map(([key, value]) => (
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
                                  className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                                >
                                  Cek Bukti <ExternalLink size={11} />
                                </a>
                              ) : (
                                <span>
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">
                          - Tidak ada -
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {order.addonOrders && order.addonOrders.length > 0 ? (
                        <div className="space-y-1">
                          {order.addonOrders.map((addonOrder) => (
                            <div
                              key={addonOrder.id}
                              className="flex items-center gap-1.5 text-xs font-medium"
                            >
                              <Package size={12} className="text-primary" />

                              <span>{addonOrder.addon.name}</span>

                              <span className="text-muted-foreground">
                                x{addonOrder.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">
                          -
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {order.approvalStatus === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-bold text-green-600 dark:text-green-400">
                          <CheckCircle2 size={13} />
                          Approved
                        </span>
                      )}

                      {order.approvalStatus === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400">
                          <XCircle size={13} />
                          Rejected
                        </span>
                      )}

                      {(order.approvalStatus === "PENDING" ||
                        order.approvalStatus === "NONE" ||
                        !order.approvalStatus) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <Clock size={13} />
                          Pending Review
                        </span>
                      )}
                    </td>

                    <td className="space-x-2 p-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-green-500/30 text-green-600 hover:bg-green-500/10"
                        disabled={
                          loadingId === order.id ||
                          order.approvalStatus === "APPROVED"
                        }
                        onClick={() =>
                          void handleStatusChange(order.id, "APPROVED")
                        }
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
                        onClick={() =>
                          void handleStatusChange(order.id, "REJECTED")
                        }
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
