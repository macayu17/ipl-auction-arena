import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "documents.iplt20.com",
        pathname: "/ipl/**",
      },
      {
        protocol: "https",
        hostname: "www.iplt20.com",
        pathname: "/assets/**",
      },
    ],
  },
};

export default nextConfig;
