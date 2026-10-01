/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '5000mb' } },
  serverExternalPackages: ['ssh2', 'ssh2-sftp-client'],
};

export default nextConfig;
