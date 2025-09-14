/**
 * DNS Cache Fix for Node.js
 *
 * Node.js can have DNS resolution issues on startup, especially with AWS services.
 * This module provides utilities to work around these issues.
 */

import {lookup} from 'dns'
import {promisify} from 'util'

const dnsLookup = promisify(lookup)

/**
 * Pre-warm DNS cache for critical services
 * Call this on server startup to avoid DNS resolution delays
 */
export async function prewarmDNS() {
	const domains = [
		// Cognito domain
		process.env.COGNITO_DOMAIN ? `${process.env.COGNITO_DOMAIN}.auth.${process.env.AWS_REGION || 'us-west-2'}.amazoncognito.com` : 'us-west-22wtjorwgh.auth.us-west-2.amazoncognito.com'
	]

	console.log('🌐 Pre-warming DNS cache for:', domains)

	const results = await Promise.allSettled(
		domains.map(async (domain) => {
			try {
				const start = Date.now()
				const result = await dnsLookup(domain, {family: 4}) // Prefer IPv4
				const duration = Date.now() - start
				console.log(`✅ DNS resolved ${domain} in ${duration}ms:`, result.address)
				return {domain, address: result.address, duration}
			} catch (error) {
				console.error(`❌ DNS resolution failed for ${domain}:`, error)
				return {domain, error}
			}
		})
	)

	return results
}

/**
 * Create a fetch wrapper that handles DNS issues
 */
export function createRobustFetch() {
	return async function robustFetch(url: string | URL, init?: RequestInit): Promise<Response> {
		const urlString = url.toString()

		// For AWS services, try with IPv4 preference
		if (urlString.includes('.amazonaws.com') || urlString.includes('.amazoncognito.com')) {
			try {
				// First attempt with default settings
				return await fetch(url, init)
			} catch (error: any) {
				// If it's a DNS or connection error, try once more after a brief delay
				if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.code === 'UND_ERR_CONNECT_TIMEOUT') {
					console.log('⏳ First fetch attempt failed, retrying after DNS settle...')

					// Brief delay to let DNS settle
					await new Promise((resolve) => setTimeout(resolve, 100))

					// Retry
					return await fetch(url, init)
				}
				throw error
			}
		}

		// For non-AWS services, use standard fetch
		return fetch(url, init)
	}
}
