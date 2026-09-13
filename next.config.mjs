/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_ACTIONS === 'true';
const repo = 'AI-Company-OS';

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: isGithubPages ? `/${repo}` : '',
  assetPrefix: isGithubPages ? `/${repo}/` : '',
};

export default nextConfig;
