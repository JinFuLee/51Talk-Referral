/** @type {import('next').NextConfig} */
const config = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-progress', 'recharts'],
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' }];
  },
};

export default config;
