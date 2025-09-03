/** @type {import('next').NextConfig} */

const repo = 'sanderblue.github.io/sanderblue.com'

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
  basePath: `/${repo}`,
  assetPrefix: `/${repo}/`,
  trailingSlash: true, // optional: helps with GitHub Pages routing
}

export default nextConfig
