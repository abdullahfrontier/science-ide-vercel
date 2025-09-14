import {store} from '@/store'
import {logout} from '@/store/thunks/authThunk'
import {updateTokens} from '@/store/slices/authSlice'

let refreshTimer: NodeJS.Timeout | null = null
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

export const scheduleTokenRefresh = () => {
	const state = store.getState()
	const idToken = state.auth.idToken

	if (refreshTimer) {
		clearTimeout(refreshTimer)
	}

	if (!idToken) {
		console.warn('⚠️ No ID token available; skipping refresh scheduling')
		return
	}

	// Schedule refresh for 12 minutes (3 minutes before the 15-minute expiry)
	const refreshDelayMs = 12 * 60 * 1000 // 12 minutes
	console.log(`⏰ Next token refresh scheduled in ${refreshDelayMs / 1000 / 60} minutes`)

	refreshTimer = setTimeout(async () => {
		console.log('⏰ Proactive token refresh triggered')
		const success = await refreshAccessToken()
		if (!success) {
			console.error('❌ Proactive token refresh failed')
		} else {
			console.log('✅ Proactive token refresh succeeded')
		}
	}, refreshDelayMs)
}

export const refreshAccessToken = async (): Promise<boolean> => {
	const state = store.getState()
	const refreshToken = state.auth.refreshToken

	console.log('🔄 refreshAccessToken called:', {
		hasRefreshToken: !!refreshToken,
		isRefreshing,
		refreshTokenPreview: refreshToken ? refreshToken.substring(0, 20) + '...' : 'missing'
	})

	// If already refreshing, wait for the existing refresh to complete
	if (isRefreshing && refreshPromise) {
		console.log('⏳ Already refreshing, waiting for existing refresh...')
		return refreshPromise
	}

	if (!refreshToken) {
		console.log('❌ No refresh token available; cannot refresh')
		return false
	}

	isRefreshing = true
	refreshPromise = performRefresh()

	try {
		return await refreshPromise
	} finally {
		isRefreshing = false
		refreshPromise = null
	}
}

export const performRefresh = async (): Promise<boolean> => {
	try {
		console.log('🔄 Attempting to refresh token using Cognito')
		// Dynamically import CognitoAuth
		const {cognitoAuth} = await import('./cognito-auth')
		const response = await cognitoAuth.refreshToken(store.getState().auth.refreshToken!)
		if (response) {
			console.log('✅ Token refresh successful via Cognito ')
			store.dispatch(updateTokens(response.id_token!))
			return true
		} else {
			console.error('❌ Cognito refresh failed, logging out')
			store.dispatch(logout())
			return false
		}
	} catch (error) {
		console.error('❌ Token refresh error:', error)
		store.dispatch(logout())
		return false
	}
}

export const clearTokenRefresh = () => {
	if (refreshTimer) {
		clearTimeout(refreshTimer)
		refreshTimer = null
		console.log('🧹 Cleared scheduled token refresh')
	}
}
