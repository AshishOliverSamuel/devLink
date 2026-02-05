/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/7.x/**",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  async rewrites() {
    const backend =
      process.env.NODE_ENV === "production"
        ? "https://your-backend.onrender.com"
        : "http://localhost:8080";

    return [
      {
        source: "/api/:path*",
        destination: `${backend}/:path*`,
      },

      {
        source: "/ws/:path*",
        destination: `${backend}/ws/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
