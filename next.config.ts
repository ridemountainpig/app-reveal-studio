import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "puppeteer-core",
    "puppeteer",
    "@sparticuz/chromium",
  ],
};

export default nextConfig;
