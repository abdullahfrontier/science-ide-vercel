import {NextApiRequest, NextApiResponse} from 'next'
import {createRobustFetch} from '../../lib/dns-cache-fix'

const robustFetch = createRobustFetch()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	const {code, redirect_uri} = req.body

	if (!code || !redirect_uri) {
		return res.status(400).json({error: 'Missing required parameters'})
	}

	// Validate required environment variables
	const cognitoDomain = process.env.COGNITO_DOMAIN
	const region = process.env.AWS_REGION
	const clientId = process.env.COGNITO_CLIENT_ID
	const clientSecret = process.env.COGNITO_CLIENT_SECRET // Optional

	if (!cognitoDomain) {
		console.error('❌ COGNITO_DOMAIN environment variable is required but not set')
		return res.status(500).json({ error: 'Server configuration error: COGNITO_DOMAIN not configured' })
	}
	if (!region) {
		console.error('❌ AWS_REGION environment variable is required but not set')
		return res.status(500).json({ error: 'Server configuration error: AWS_REGION not configured' })
	}
	if (!clientId) {
		console.error('❌ COGNITO_CLIENT_ID environment variable is required but not set')
		return res.status(500).json({ error: 'Server configuration error: COGNITO_CLIENT_ID not configured' })
	}

	const tokenEndpoint = `https://${cognitoDomain}.auth.${region}.amazoncognito.com/oauth2/token`

	try {
		console.log('Token exchange request:', {
			tokenEndpoint,
			clientId,
			hasSecret: !!clientSecret,
			isPublicClient: !clientSecret,
			redirect_uri,
			code: code.substring(0, 10) + '...'
		})

		// Prepare request body - DO NOT include empty client_secret for public clients
		const tokenParams: any = {
			grant_type: 'authorization_code',
			client_id: clientId,
			code,
			redirect_uri
		}

		// ONLY add client_secret if it's actually set (not empty string)
		if (clientSecret && clientSecret.trim() !== '') {
			console.log('🔐 Using confidential client with secret')
			tokenParams.client_secret = clientSecret
		} else {
			console.log('🌐 Using public client (no secret)')
		}

		// Exchange auth code for tokens with timeout and retry
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout (reduced from 30)

		// Log the actual request body for debugging
		const requestBody = new URLSearchParams(tokenParams).toString()
		console.log('📤 Request body params:', Object.keys(tokenParams))

		let response
		try {
			response = await robustFetch(tokenEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'application/json',
					// Add cache control to prevent caching issues
					'Cache-Control': 'no-cache'
				},
				body: requestBody,
				signal: controller.signal,
				// Disable keep-alive to avoid connection reuse issues on server restart
				keepalive: false
			})
		} catch (error: any) {
			clearTimeout(timeoutId)

			// If it's a network timeout, try once more with a shorter timeout
			if (error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' || error.code === 'UND_ERR_CONNECT_TIMEOUT') {
				console.log('⏱️ First attempt timed out, retrying with shorter timeout...')

				const retryController = new AbortController()
				const retryTimeoutId = setTimeout(() => retryController.abort(), 5000) // 5 second retry

				try {
					response = await robustFetch(tokenEndpoint, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
							Accept: 'application/json',
							'Cache-Control': 'no-cache'
						},
						body: requestBody,
						signal: retryController.signal,
						keepalive: false
					})
					clearTimeout(retryTimeoutId)
				} catch (retryError) {
					clearTimeout(retryTimeoutId)
					console.error('❌ Retry also failed:', retryError)
					throw error // Throw original error
				}
			} else {
				throw error
			}
		}

		clearTimeout(timeoutId)

		let tokens
		try {
			tokens = await response.json()
		} catch (jsonErr: any) {
			return res.status(500).json({
				error: 'server_error',
				message: 'server_error'
			})
		}

		if (!response.ok) {
			console.error('❌ [/api/token] Token exchange failed:', tokens)
			return res.status(response.status).json({
				error: tokens.error || 'Failed to exchange code',
				message: tokens.error_description
			})
		}

		console.log('✅ [/api/token] Token exchange successful:', {
			hasAccessToken: !!tokens.access_token,
			hasIdToken: !!tokens.id_token,
			hasRefreshToken: !!tokens.refresh_token,
			refreshTokenLength: tokens.refresh_token?.length,
			refreshTokenPreview: tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : 'missing',
			expiresIn: tokens.expires_in
		})

		// Return tokens to frontend
		res.json({
			access_token: tokens.access_token,
			id_token: tokens.id_token,
			refresh_token: tokens.refresh_token,
			expires_in: tokens.expires_in,
			token_type: tokens.token_type
		})
	} catch (error: any) {
		console.error('Token exchange error:', error)

		// Check for specific error types
		if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
			console.error('🌐 Network timeout connecting to Cognito:', {
				endpoint: tokenEndpoint,
				error: error.message
			})
			return res.status(504).json({
				error: 'Gateway timeout',
				message: 'Unable to connect to AWS Cognito. This might be a temporary network issue. Please check your internet connection and try again in a few moments.',
				details: 'If this persists, your network might be blocking connections to AWS services.'
			})
		}

		if (error.name === 'AbortError') {
			return res.status(504).json({
				error: 'Request timeout',
				message: 'The request to Cognito timed out. Please try again.'
			})
		}

		res.status(500).json({
			error: 'Internal server error',
			message: error.message || 'Failed to exchange authorization code'
		})
	}
}
