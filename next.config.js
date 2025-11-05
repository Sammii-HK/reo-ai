/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Exclude backend folder from build
  webpack: (config) => {
    // Ignore backend folder in watch mode
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/backend/**', '**/node_modules/**'],
    }
    return config
  },
}

module.exports = nextConfig
