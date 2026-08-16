"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function AddUserModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "USER",
    status: "ACTIVE", // Tambahan fitur status
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Reset pesan error jika user mulai mengetik ulang
    if (errorMsg) setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Memanggil API Endpoint untuk menyimpan user
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      // Jika response dari API gagal (status bukan 200/201)
      if (!res.ok) {
        throw new Error(data.message || "Gagal menyimpan data ke server.");
      }

      // Jika berhasil
      setSuccessMsg("Pengguna berhasil ditambahkan!");

      // Tunggu sebentar agar user melihat pesan sukses, lalu tutup
      setTimeout(() => {
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          role: "USER",
          status: "ACTIVE",
        });
        setIsOpen(false);
        setSuccessMsg("");
        // Refresh halaman agar data terbaru langsung muncul di tabel
        router.refresh();
      }, 1500);
    } catch (error: unknown) {
      console.error("Error adding user:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Gagal menambahkan pengguna. Silakan coba lagi.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk reset state saat modal ditutup
  const handleClose = () => {
    if (isLoading) return; // Jangan tutup jika sedang memproses (loading)
    setIsOpen(false);
    setErrorMsg("");
    setSuccessMsg("");
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "USER",
      status: "ACTIVE",
    });
  };

  return (
    <>
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(true)}
        className="group flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-200 transition-all duration-200 hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
      >
        <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-300" />
        Tambah User
      </button>

      {/* MODAL OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          {/* BACKDROP */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          {/* MODAL CONTENT */}
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 ease-out">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Tambah Pengguna Baru
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Lengkapi informasi di bawah untuk membuat akun baru.
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* BODY / FORM */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-6 space-y-8">
                {/* Feedback Messages */}
                {errorMsg && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="font-medium">{errorMsg}</p>
                  </div>
                )}
                {successMsg && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-600 border border-emerald-100">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <p className="font-medium">{successMsg}</p>
                  </div>
                )}

                {/* Grid Layout untuk membagi form menjadi 2 kolom */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* KOLOM KIRI: Informasi Dasar */}
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">
                      Informasi Dasar
                    </h3>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50/50 hover:bg-white"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Alamat Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50/50 hover:bg-white"
                          placeholder="john@perusahaan.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Nomor Telepon
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50/50 hover:bg-white"
                          placeholder="+62 812 3456 7890"
                        />
                      </div>
                    </div>
                  </div>

                  {/* KOLOM KANAN: Keamanan & Akses */}
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">
                      Keamanan & Akses
                    </h3>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Peran (Role) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Shield className="h-4 w-4 text-slate-400" />
                        </div>
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          className="block w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50/50 hover:bg-white appearance-none"
                        >
                          <option value="USER">User Reguler</option>
                          <option value="EO">Mitra Event Organizer (EO)</option>
                          <option value="SUPER_ADMIN">Super Admin</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Status Akun
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="block w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50/50 hover:bg-white"
                      >
                        <option value="ACTIVE">Aktif (Dapat Login)</option>
                        <option value="INACTIVE">Nonaktif / Suspend</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Kata Sandi <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          required
                          value={formData.password}
                          onChange={handleChange}
                          className="block w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-slate-50/50 hover:bg-white"
                          placeholder="Minimal 6 karakter"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER / ACTIONS */}
              <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-200 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Buat Pengguna"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
