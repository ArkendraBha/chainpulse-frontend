/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self' https:; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; " +
              "style-src 'self' 'unsafe-inline' https:; " +
              "img-src 'self' data: https:; " +
              "connect-src 'self' https:; " +
              "font-src 'self' data: https:; " +
              "frame-src https:; ",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
