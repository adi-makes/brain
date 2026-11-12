import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@second-brain/schemas"],
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
};

export default nextConfig;
