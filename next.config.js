/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // 이미지 최적화 설정
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
