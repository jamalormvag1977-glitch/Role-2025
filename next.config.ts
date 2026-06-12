import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Vercel handles output automatically - do NOT use "standalone" */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ['xlsx'],
};

export default nextConfig;
