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
  // Options for GH Page compatibility
  output: 'export', // deploy as a static build
  basePath: '',
  assetPrefix: '',
}

export default nextConfig
