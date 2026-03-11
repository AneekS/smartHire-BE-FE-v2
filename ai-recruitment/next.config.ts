import type { NextConfig } from "next";

const nextConfig: NextConfig = {
<<<<<<< HEAD
  /* config options here */
  turbopack: {
    root: __dirname
  }
=======
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
  turbopack: {},
  serverExternalPackages: ['pdf-parse', 'mammoth'],
>>>>>>> 259d56c (Resume done ✅)
};

export default nextConfig;
