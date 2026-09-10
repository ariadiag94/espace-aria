import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/api/devis/*/pdf': ['./public/logo-aria.svg'],
    '/api/devis/*/send': ['./public/logo-aria.svg'],
  },
}

export default nextConfig
