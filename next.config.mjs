/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,
    reactStrictMode: true,
    output: 'standalone',
    // Increase body size limit for large file uploads
    serverExternalPackages: ['@prisma/client'],
    // Explicitly expose environment variables to the client
    env: {
        NEXT_PUBLIC_APPKIT_DOMAIN: process.env.NEXT_PUBLIC_APPKIT_DOMAIN,
        NEXT_PUBLIC_APPKIT_CLIENT_ID: process.env.NEXT_PUBLIC_APPKIT_CLIENT_ID,
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
                ],
            },
        ];
    },
};

export default nextConfig;
