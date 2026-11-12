import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@second-brain/schemas"],
  poweredByHeader: false,
};

export default nextConfig;
