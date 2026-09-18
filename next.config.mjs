/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['ssh2', 'ssh2-sftp-client'],
  async rewrites() {
    const socketPort = process.env.SOCKET_PORT || 3014;
    console.log(`[Next.js Config] Configuring socket.io proxy to port: ${socketPort}`);
    return [
      {
        source: '/socket.io',
        destination: `http://localhost:${socketPort}/socket.io`,
      },
      {
        source: '/socket.io/:path*',
        destination: `http://localhost:${socketPort}/socket.io/:path*`,
      }
    ];
  },
};

export default nextConfig;
