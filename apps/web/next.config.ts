import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@defense/schema",
    "@defense/graph-store",
    "@defense/ingestion",
    "@defense/analyst",
    "@defense/validation",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
