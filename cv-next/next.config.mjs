/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // isomorphic-dompurify pulls in jsdom which uses fs.readFileSync for a CSS file.
  // Externalizing prevents webpack from bundling it — loads from node_modules at runtime instead.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
}

export default nextConfig
