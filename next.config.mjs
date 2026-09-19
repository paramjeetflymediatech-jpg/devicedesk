/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['ssh2', 'ssh2-sftp-client'],
  async rewrites() {
    const socketPort = process.env.SOCKET_PORT || 3018;
    // console.log(`[Next.js Config] Configuring socket.io proxy to port: ${socketPort}`);
    return [
      {
        source: '/socket.io',
        destination: `http://127.0.0.1:${socketPort}/socket.io`,
      },
      {
        source: '/socket.io/:path*',
        destination: `http://127.0.0.1:${socketPort}/socket.io/:path*`,
      }
    ];
  },
};

export default nextConfig;
