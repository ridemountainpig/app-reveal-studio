import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["ioredis", "puppeteer"],
};

export default nextConfig;
