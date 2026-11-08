import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  serverExternalPackages: ["mongoose"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
