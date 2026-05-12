import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "20mb",
  },
  serverExternalPackages: [
    // Keep storage SDKs outside the bundle. Avoids Turbopack pulling in the
    // unused driver (and its optional deps like ali-oss → proxy-agent).
    "ali-oss",
    "@aws-sdk/client-s3",
  ],
};

export default nextConfig;
