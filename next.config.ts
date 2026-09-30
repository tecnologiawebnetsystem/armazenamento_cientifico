import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    const backendUrl = process.env.NODE_ENV === "development"
      ? "http://localhost:8080"
      : process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8080"

    return [
      {
        source: "/api/docs",
        destination: `${backendUrl}/docs`,
      },
      {
        source: "/api/redoc",
        destination: `${backendUrl}/redoc`,
      },
      {
        source: "/api/openapi.json",
        destination: `${backendUrl}/openapi.json`,
      },
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
