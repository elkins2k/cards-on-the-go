import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: true,
  },
  transpilePackages: ['react-leaflet', '@react-leaflet/core'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to load node-specific modules on the client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false
      };
    }
    return config;
  },
};

export default nextConfig;
