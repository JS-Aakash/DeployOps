/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
        pathname: '**',
      },
    ],
  },
  // In Next.js 15/16, some legacy ignore flags are moved or deprecated.
  // We'll keep them minimal to avoid 'unrecognized key' errors.
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
