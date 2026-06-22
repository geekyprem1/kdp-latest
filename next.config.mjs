/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // puppeteer is only used in scripts / future server tasks, never bundled into the client
  serverExternalPackages: ["puppeteer"],
};

export default nextConfig;
