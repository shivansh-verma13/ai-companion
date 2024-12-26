import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com**",
      },
    ],
  },
};

module.exports = {
  images: {
    domains: ['res.cloudinary.com'],
  },
}

export default nextConfig;
