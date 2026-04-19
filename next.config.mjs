/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remotion packages use CommonJS internals that need explicit transpilation
  transpilePackages: ["remotion", "@remotion/player", "@remotion/cli"],
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};

export default nextConfig;
