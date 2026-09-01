/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mantém o tracing restrito ao frontend e elimina a ambiguidade entre lockfiles do monorepo.
  outputFileTracingRoot: new URL(".", import.meta.url).pathname,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
