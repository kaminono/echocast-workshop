/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript 严格检查
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  // 生产环境优化
  reactStrictMode: true,
}

module.exports = nextConfig
