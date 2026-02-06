import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Suppress benign next-intl dynamic import warning
    config.infrastructureLogging = {
      level: "error",
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
