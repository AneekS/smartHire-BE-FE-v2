import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  /* config options here */
  turbopack: {
    root: __dirname
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      }
    }
    return config
  },
  serverExternalPackages: ['pdf-parse', 'mammoth'],
};

export default nextConfig;
