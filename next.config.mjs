/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdf-parse uses fs — exclude from client bundle
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};

export default nextConfig;
