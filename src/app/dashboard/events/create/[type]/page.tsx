"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

const LoadingForm = () => (
  <div className="flex flex-col items-center justify-center py-20 text-blue-600 gap-3">
    <Loader2 size={32} className="animate-spin" />
    <span className="font-bold text-sm">Menyiapkan formulir...</span>
  </div>
);

// Peta Komponen dengan jalur yang benar
const formRegistry: Record<string, React.ComponentType> = {
  lari: dynamic(() => import("../../_components/forms/EventFormLari"), {
    loading: LoadingForm,
    ssr: false,
  }),
  renang: dynamic(() => import("../../_components/forms/EventFormRenang"), {
    loading: LoadingForm,
    ssr: false,
  }),
  pelatihan: dynamic(
    () => import("../../_components/forms/EventFormPelatihan"),
    {
      loading: LoadingForm,
      ssr: false,
    },
  ),
  lainnya: dynamic(() => import("../../_components/forms/EventFormLainnya"), {
    loading: LoadingForm,
    ssr: false,
  }),
};

export default function CreateEventByTypePage() {
  const params = useParams();
  const rawType = ((params?.type as string) || "lainnya").toLowerCase();

  const FormComponent = formRegistry[rawType] || formRegistry.lainnya;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <FormComponent />
    </div>
  );
}
