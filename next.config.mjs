/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['ssh2', 'ssh2-sftp-client'],
  async rewrites() {
    return [
      {
        source: '/socket.io',
        destination: 'http://127.0.0.1:3001/socket.io',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://127.0.0.1:3001/socket.io/:path*',
      }
    ];
  },
};

export default nextConfig;
