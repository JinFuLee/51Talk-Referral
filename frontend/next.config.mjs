/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const config = {
  // 启用 standalone 输出，Docker 运行时仅需 .next/standalone（无需完整 node_modules）
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-progress'],
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default config;
