import {store} from '@/store'
import {logout} from '@/store/thunks/authThunk'

export interface ApiError {
	error: string
	details?: string
}

// export interface ApiResponse<T = any> {
// 	data?: T
// 	message?: string
// 	error?: string
// 	details?: string
// }

const createApiClient = () => {
	// const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002'

	const getAuthHeaders = () => {
		const state = store.getState()
		const idToken = state.auth.idToken
		const headers: Record<string, string> = {'Content-Type': 'application/json'}
		if (idToken) headers['Authorization'] = `Bearer ${idToken}`
		return headers
	}

	// const _refreshAccessToken = async () => {
	// 	const result = await store.dispatch(refreshAccessToken())
	// 	return refreshAccessToken.fulfilled.match(result)
	// }

	const handleResponse = async (response: Response, isRetry = false, isDownload = false): Promise<any> => {
		console.log(`🌐 API Response: ${response.status} ${response.url}, isRetry: ${isRetry}`)
		if (!response.ok) {
			if (response.status === 401) {
				await store.dispatch(logout()).unwrap()
				throw new Error('Authentication required')
			}
			if (response.status === 404) {
				const errorData = await response.json().catch(() => ({error: 'Not found'}))
				throw new Error(errorData.error || 'Resource not found')
			}
			if (response.status === 409) {
				const errorData = await response.json().catch(() => ({error: 'Conflict'}))
				throw new Error(errorData.error || 'Resource conflict')
			}
			if (response.status === 504) {
				const errorMessage = 'Request timed out due to server limits. Try reducing the experiment size or contact support.'
				const errorData = await response.json().catch(() => ({error: errorMessage}))
				throw new Error(errorData.error || errorMessage)
			}
			const errorData = await response.json().catch(() => ({error: 'Request failed'}))
			throw new Error(errorData.error || `Request failed with status ${response.status}`)
		}
		if (isDownload) return response
		const contentType = response.headers.get('content-type')
		if (contentType && contentType.includes('application/json')) return response.json()
		return response.text()
	}

	// const get = async (endpoint: string, params?: Record<string, string | number>, requireAuth = false, isRetry = false) => {
	// 	const url = new URL(`${baseUrl}${endpoint}`)
	// 	if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v.toString()))
	// 	const headers = requireAuth ? getAuthHeaders() : {'Content-Type': 'application/json'}

	// 	const res = await fetch(url.toString(), {method: 'GET', headers})
	// 	try {
	// 		return await handleResponse(res, isRetry)
	// 	} catch (e: any) {
	// 		if (e.message === 'RETRY_WITH_NEW_TOKEN' && !isRetry) return get(endpoint, params, requireAuth, true)
	// 		throw e
	// 	}
	// }

	// const post = async (endpoint: string, data?: any, requireAuth = false, isRetry = false) => {
	// 	const headers = requireAuth ? getAuthHeaders() : {'Content-Type': 'application/json'}
	// 	const res = await fetch(`${baseUrl}${endpoint}`, {
	// 		method: 'POST',
	// 		headers,
	// 		body: data ? JSON.stringify(data) : undefined
	// 	})
	// 	try {
	// 		return await handleResponse(res, isRetry)
	// 	} catch (e: any) {
	// 		if (e.message === 'RETRY_WITH_NEW_TOKEN' && !isRetry) return post(endpoint, data, requireAuth, true)
	// 		throw e
	// 	}
	// }

	// const put = async (endpoint: string, data?: any, requireAuth = true, isRetry = false) => {
	// 	const headers = requireAuth ? getAuthHeaders() : {'Content-Type': 'application/json'}
	// 	const res = await fetch(`${baseUrl}${endpoint}`, {
	// 		method: 'PUT',
	// 		headers,
	// 		body: data ? JSON.stringify(data) : undefined
	// 	})
	// 	try {
	// 		return await handleResponse(res, isRetry)
	// 	} catch (e: any) {
	// 		if (e.message === 'RETRY_WITH_NEW_TOKEN' && !isRetry) return put(endpoint, data, requireAuth, true)
	// 		throw e
	// 	}
	// }

	// const del = async (endpoint: string, requireAuth = false, isRetry = false) => {
	// 	const headers = requireAuth ? getAuthHeaders() : {'Content-Type': 'application/json'}
	// 	const res = await fetch(`${baseUrl}${endpoint}`, {method: 'DELETE', headers})
	// 	try {
	// 		return await handleResponse(res, isRetry)
	// 	} catch (e: any) {
	// 		if (e.message === 'RETRY_WITH_NEW_TOKEN' && !isRetry) return del(endpoint, requireAuth, true)
	// 		throw e
	// 	}
	// }

	// const postAuthenticated = (endpoint: string, data?: any) => post(endpoint, data, true)
	// const putAuthenticated = (endpoint: string, data?: any) => put(endpoint, data, true)
	// const getAuthenticated = (endpoint: string, params?: Record<string, string | number>) => get(endpoint, params, true)
	// const deleteAuthenticated = (endpoint: string) => del(endpoint, true)

	const postToNextJS = async (endpoint: string, data?: any, isRetry = false, isDownload = false) => {
		const headers = getAuthHeaders()
		const res = await fetch(endpoint, {method: 'POST', headers, body: data ? JSON.stringify(data) : undefined})
		try {
			return await handleResponse(res, isRetry, isDownload)
		} catch (e: any) {
			if (e.message === 'RETRY_WITH_NEW_TOKEN' && !isRetry) return postToNextJS(endpoint, data, true)
			throw e
		}
	}

	const getFromNextJS = async (endpoint: string, isRetry = false) => {
		const headers = getAuthHeaders()
		const res = await fetch(endpoint, {method: 'GET', headers})
		try {
			return await handleResponse(res, isRetry)
		} catch (e: any) {
			if (e.message === 'RETRY_WITH_NEW_TOKEN' && !isRetry) return getFromNextJS(endpoint, true)
			throw e
		}
	}

	const putToNextJS = async (endpoint: string, data?: any, isRetry = false) => {
		const headers = getAuthHeaders()
		const res = await fetch(endpoint, {method: 'PUT', headers, body: data ? JSON.stringify(data) : undefined})
		try {
			return await handleResponse(res, isRetry)
		} catch (e: any) {
			if (e.message === 'RETRY_WITH_NEW_TOKEN' && !isRetry) return putToNextJS(endpoint, data, true)
			throw e
		}
	}

	return {
		getFromNextJS,
		postToNextJS,
		putToNextJS
	}
}

export const apiClient = createApiClient()

export const handleApiError = (error: unknown, operation: string): ApiError => {
	console.error(`Error ${operation}:`, error)
	if (error instanceof Error) return {error: `Failed to ${operation}`, details: error.message}
	return {error: `Failed to ${operation}`, details: 'Unknown error occurred'}
}
