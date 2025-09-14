/**
 * Minimal Cognito authentication client
 * Uses runtime configuration from API endpoint
 */

import {CognitoConfig} from '../pages/api/auth-config'

export class CognitoAuth {
	private cognitoUrl: string | null = null
	private clientId: string | null = null
	private redirectUri: string
	private configPromise: Promise<CognitoConfig> | null = null

	constructor() {
		// Dynamic redirect URI based on environment
		this.redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'http://localhost:3000/auth/callback'
	}

	/**
	 * Load Cognito configuration from API with localStorage caching
	 */
	private async loadConfig(): Promise<CognitoConfig> {
		// Return cached promise if already loading
		if (this.configPromise) {
			return this.configPromise
		}

		this.configPromise = this.loadConfigInternal()
		return this.configPromise
	}

	private async loadConfigInternal(): Promise<CognitoConfig> {
		// Check localStorage cache first (client-side only)
		if (typeof window !== 'undefined') {
			const cached = localStorage.getItem('cognito_config')
			const cacheTime = localStorage.getItem('cognito_config_time')

			if (cached && cacheTime) {
				const age = Date.now() - parseInt(cacheTime)
				// Use cache for 5 minutes
				if (age < 5 * 60 * 1000) {
					try {
						const config = JSON.parse(cached) as CognitoConfig
						this.initializeFromConfig(config)
						return config
					} catch (error) {
						console.warn('Failed to parse cached config, fetching fresh:', error)
					}
				}
			}
		}

		// Fetch fresh configuration from API
		try {
			const response = await fetch('/api/auth-config')
			if (!response.ok) {
				throw new Error(`Failed to load Cognito configuration: ${response.status} ${response.statusText}`)
			}

			const config: CognitoConfig = await response.json()

			// Cache in localStorage (client-side only)
			if (typeof window !== 'undefined') {
				localStorage.setItem('cognito_config', JSON.stringify(config))
				localStorage.setItem('cognito_config_time', Date.now().toString())
			}

			this.initializeFromConfig(config)
			return config
		} catch (error) {
			console.error('Failed to load Cognito configuration:', error)
			throw error
		}
	}

	private initializeFromConfig(config: CognitoConfig) {
		this.cognitoUrl = `https://${config.domain}.auth.${config.region}.amazoncognito.com`
		this.clientId = config.clientId
	}

	/**
	 * Ensure configuration is loaded before using
	 */
	private async ensureConfigLoaded(): Promise<void> {
		if (!this.cognitoUrl || !this.clientId) {
			await this.loadConfig()
		}
	}

	/**
	 * Redirect to Cognito for login
	 */
	async login(provider?: 'Google') {
		await this.ensureConfigLoaded()

		const params = new URLSearchParams({
			client_id: this.clientId!,
			response_type: 'code',
			scope: 'openid email profile',
			redirect_uri: this.redirectUri,
			...(provider && {identity_provider: provider})
		})

		window.location.href = `${this.cognitoUrl}/oauth2/authorize?${params}`
	}

	/**
	 * Login with email/password (uses Cognito hosted UI)
	 */
	async loginWithEmail() {
		await this.login() // Cognito UI handles email/password
	}

	/**
	 * Login with Google
	 */
	async loginWithGoogle() {
		await this.login('Google')
	}

	/**
	 * Handle OAuth2 callback - exchange code for tokens
	 */
	async handleCallback(code: string): Promise<any> {
		try {
			const response = await fetch('/api/token', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					code,
					redirect_uri: this.redirectUri
				})
			})

			if (!response.ok) {
				const error = await response.json()
				console.error('Token exchange failed:', error)
				throw new Error(error.message || error.error || 'Failed to exchange code for tokens')
			}

			const tokenData = await response.json()
			console.log('Token response received:', {
				hasAccessToken: !!tokenData.access_token,
				hasIdToken: !!tokenData.id_token,
				hasRefreshToken: !!tokenData.refresh_token
			})

			const {access_token, id_token, refresh_token} = tokenData

			if (!access_token || !id_token) {
				throw new Error('Missing required tokens in response')
			}

			// Store tokens
			console.log('💾 Storing tokens:', {
				accessTokenLength: access_token?.length,
				idTokenLength: id_token?.length,
				refreshTokenLength: refresh_token?.length,
				refreshTokenPreview: refresh_token ? refresh_token.substring(0, 20) + '...' : 'missing'
			})

			// Decode ID token for user info (no verification - backend does that)
			const payload = id_token.split('.')[1]
			const user = JSON.parse(atob(payload))

			console.log('User info from ID token:', {
				email: user.email,
				name: user.name,
				email_verified: user.email_verified
			})

			const data = {
				user: user,
				accessToken: access_token,
				idToken: id_token,
				refreshToken: refresh_token
			}
			return data // Return the data object
		} catch (error) {
			console.error('Failed to handle auth callback:', error)
			throw error
		}
	}

	/**
	 * Refresh access token using refresh token
	 */
	async refreshToken(refresh_token: string): Promise<any> {
		console.log('🔄 CognitoAuth.refreshToken called:', {
			hasRefreshToken: !!refresh_token,
			refreshTokenPreview: refresh_token ? refresh_token.substring(0, 20) + '...' : 'missing'
		})

		if (!refresh_token) {
			console.log('❌ No refresh token available in CognitoAuth')
			return false
		}

		await this.ensureConfigLoaded()

		try {
			console.log('📡 Calling Cognito token endpoint directly...')

			// Direct call to Cognito's token endpoint
			const response = await fetch(`${this.cognitoUrl}/oauth2/token`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					client_id: this.clientId!,
					refresh_token: refresh_token
				})
			})

			console.log('📡 Cognito refresh response status:', response.status)

			if (response.ok) {
				const data = await response.json()
				console.log('✅ Refresh successful, new tokens received:', {
					hasAccessToken: !!data.access_token,
					hasIdToken: !!data.id_token,
					expiresIn: data.expires_in
				})

				// Cognito returns access_token and id_token
				// if (data.access_token) {
				// 	localStorage.setItem('access_token', data.access_token)
				// }
				// if (data.id_token) {
				// 	localStorage.setItem('id_token', data.id_token)
				// }

				// Note: Cognito doesn't rotate refresh tokens by default
				// The same refresh_token continues to work

				return data
			} else {
				const errorData = await response.text()
				console.error('❌ Token refresh failed:', response.status, errorData)
				return false
			}
		} catch (error) {
			console.error('❌ Token refresh error:', error)
			return false
		}
	}

	/**
	 * Logout user
	 */
	async logout() {
		await this.ensureConfigLoaded()

		// Redirect to Cognito logout
		const params = new URLSearchParams({
			client_id: this.clientId!,
			logout_uri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
		})

		window.location.href = `${this.cognitoUrl}/logout?${params}`
	}
}

// Export singleton instance
export const cognitoAuth = new CognitoAuth()
