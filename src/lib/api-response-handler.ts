import {NextApiResponse} from 'next'

/**
 * Handle backend API responses consistently across all Next.js API routes
 * Ensures 401 errors are passed through to the frontend for token refresh
 */
export async function handleBackendResponse(
	backendResponse: Response,
	res: NextApiResponse,
	options?: {
		handle404?: () => void
		handle401?: () => void
	}
) {
	// Handle successful responses
	if (backendResponse.ok) {
		const data = await backendResponse.json()
		return data
	}

	// Handle 404 - allow custom handling
	if (backendResponse.status === 404 && options?.handle404) {
		options.handle404()
		return null
	}

	// Handle 401 - ALWAYS pass through to frontend for token refresh
	if (backendResponse.status === 401) {
		console.log('[API] Passing through 401 to frontend for token refresh')
		if (options?.handle401) {
			options.handle401()
		} else {
			res.status(401).json({error: 'Unauthorized', message: 'Authentication required'})
		}
		return null
	}

	// Handle 403 - pass through for authorization errors
	if (backendResponse.status === 403) {
		console.log('[API] Passing through 403 to frontend')
		res.status(403).json({error: 'Forbidden', message: 'You do not have permission to access this resource'})
		return null
	}

	// Handle other errors
	const errorData = await backendResponse.json().catch(() => ({error: 'Request failed'}))

	// For 5xx errors, log them but still throw to be handled by the catch block
	if (backendResponse.status >= 500) {
		console.error(`[API] Backend server error: ${backendResponse.status}`, errorData)
		throw new Error(errorData.error || `Backend server error: ${backendResponse.status}`)
	}

	// For other 4xx errors, pass them through
	res.status(backendResponse.status).json(errorData)
	return null
}
