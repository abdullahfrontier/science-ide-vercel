const createNextPluginPreval = require('next-plugin-preval/config')
const withNextPluginPreval = createNextPluginPreval()

// Load LiveKit secrets at Next.js startup
try {
	const {loadLiveKitSecrets} = require('./scripts/load-livekit-secrets')
	const environment = process.env.NODE_ENV === 'production' ? 'production' : process.env.NODE_ENV === 'staging' ? 'staging' : 'development'

	// Load secrets synchronously (this sets process.env within the Next.js process)
	loadLiveKitSecrets(environment)
} catch (error) {
	console.error('⚠️  Failed to load LiveKit secrets:', error.message)
	console.error('   Application will continue but LiveKit features may not work')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: false,
	transpilePackages: ['antd', '@ant-design/icons', '@ant-design/icons-svg', 'rc-util', 'rc-pagination', 'rc-picker', 'rc-tree', 'rc-tree-select', 'rc-table'],
	experimental: {
		esmExternals: 'loose',
		serverActions: {
			bodySizeLimit: '10mb'
		}
	},
	output: 'standalone'
}

module.exports = withNextPluginPreval(nextConfig)
