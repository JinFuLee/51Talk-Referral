/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const config = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-progress', 'recharts'],
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default config;
