/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React Strict Mode in development to prevent double renders
  // This significantly improves development experience and reduces rebuilds
  reactStrictMode: process.env.NODE_ENV === "production",
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;

