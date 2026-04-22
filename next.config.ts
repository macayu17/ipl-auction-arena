import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
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
  {
    protocol: "https",
    hostname: "assets.iplt20.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "a.espncdn.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "upload.wikimedia.org",
    pathname: "/wikipedia/**",
  },
  {
    protocol: "https",
    hostname: "brightcove.iplt20.com",
    pathname: "/**",
  },
];

const playerImageBaseUrl = process.env.PLAYER_IMAGE_BASE_URL?.trim();

if (playerImageBaseUrl) {
  try {
    const parsedPlayerImageBaseUrl = new URL(playerImageBaseUrl);
    const normalizedPathname = parsedPlayerImageBaseUrl.pathname.replace(/\/+$/, "");
    const protocol =
      parsedPlayerImageBaseUrl.protocol === "https:"
        ? "https"
        : parsedPlayerImageBaseUrl.protocol === "http:"
          ? "http"
          : null;

    if (!protocol) {
      throw new Error("Unsupported PLAYER_IMAGE_BASE_URL protocol");
    }

    remotePatterns.push({
      protocol,
      hostname: parsedPlayerImageBaseUrl.hostname,
      port: parsedPlayerImageBaseUrl.port || "",
      pathname: `${normalizedPathname || ""}/**`,
      search: "",
    });
  } catch {
    console.warn("Invalid PLAYER_IMAGE_BASE_URL. Skipping image remote pattern setup.");
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns,
  },
};

export default nextConfig;
