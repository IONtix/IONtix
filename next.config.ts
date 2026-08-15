import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Anda bisa menaikkannya ke '10mb' jika dirasa kurang
    },
  },
  // Jika ada pengaturan lain sebelumnya (seperti images, dll), biarkan saja dan tambahkan blok experimental di atas
};

export default nextConfig;
