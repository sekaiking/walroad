import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Turbopack is enabled by default in Next.js 16
	// Empty config silences the webpack migration warning
	turbopack: {},
};

export default nextConfig;
