import type { NextConfig } from "next";

// Browsers reject "*" together with credentials; use the configured origin
// and only allow credentials when it is a concrete one.
const allowedOrigin = process.env.NEXT_PUBLIC_DOMAIN || "*";
const corsHeaders = [
	{ key: "Access-Control-Allow-Origin", value: allowedOrigin },
	...(allowedOrigin === "*"
		? []
		: [{ key: "Access-Control-Allow-Credentials", value: "true" }]),
	{
		key: "Access-Control-Allow-Methods",
		value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
	},
	{
		key: "Access-Control-Allow-Headers",
		value:
			"X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
	},
	...(allowedOrigin === "*" ? [] : [{ key: "Vary", value: "Origin" }]),
];

const nextConfig: NextConfig = {
	async headers() {
		return [
			{
				source: "/api/:path*",
				headers: corsHeaders,
			},
		];
	},
};

export default nextConfig;
