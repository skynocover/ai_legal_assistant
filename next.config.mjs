/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // 處理 @ffmpeg/ffmpeg 的動態載入
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
  // 允許跨域載入 ffmpeg core
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
}

export default nextConfig
