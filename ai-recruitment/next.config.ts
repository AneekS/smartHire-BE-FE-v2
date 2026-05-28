import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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
  serverExternalPackages: ['pdf-parse', 'mammoth', 'tesseract.js', 'pdfjs-dist', '@napi-rs/canvas'],
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
