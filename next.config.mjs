import { withPayload } from '@payloadcms/next/withPayload'

const appURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
let appMediaPattern = null

try {
  const parsedURL = new URL(appURL)
  appMediaPattern = {
    protocol: parsedURL.protocol.replace(':', ''),
    hostname: parsedURL.hostname,
    pathname: '/api/media/**',
    ...(parsedURL.port ? { port: parsedURL.port } : {}),
  }
} catch {
  appMediaPattern = null
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/media/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/api/media/**',
      },
      ...(appMediaPattern ? [appMediaPattern] : []),
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
