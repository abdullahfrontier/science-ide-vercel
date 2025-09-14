import {NextApiResponse} from 'next'
import {withAuth, AuthenticatedRequest, getBaseUrl, createAuthHeaders} from '@/lib/auth-middleware'
import {handleApiError} from '@/api/client'
import {handleBackendResponse} from '@/lib/api-response-handler'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	const {experimentId, sessionId, orgId} = req.query
	const {scope = 'session', date} = req.query

	console.log('Session summary request:', {orgId, experimentId, sessionId, scope, date})

	if (!experimentId) {
		return res.status(400).json({error: 'Experiment ID is required'})
	}

	if (!orgId) {
		return res.status(400).json({error: 'Organization ID is required'})
	}

	if (scope !== 'session' && scope !== 'day') {
		return res.status(400).json({error: 'Invalid scope parameter. Must be "session" or "day"'})
	}

	if (scope === 'session' && !sessionId) {
		return res.status(400).json({error: 'Session ID is required when scope is "session"'})
	}

	if (scope === 'day' && date) {
		// Validate date format (ISO date string)
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/
		if (!dateRegex.test(date as string)) {
			return res.status(400).json({error: 'Invalid date format. Use ISO date format (YYYY-MM-DD)'})
		}
	}

	const baseUrl = getBaseUrl()

	try {
		// Build query parameters
		const params = new URLSearchParams()
		if (scope) params.append('scope', scope as string)
		if (sessionId && scope === 'session') params.append('session_id', sessionId as string)
		if (date && scope === 'day') params.append('date', date as string)

		const queryString = params.toString()
		const url = `${baseUrl}/organizations/${encodeURIComponent(orgId as string)}/experiments/${encodeURIComponent(experimentId as string)}/summary${queryString ? `?${queryString}` : ''}`

		console.log('Calling backend API:', url)

		const response = await fetch(url, {
			method: 'GET',
			headers: createAuthHeaders(req.token)
		})

		const data = await handleBackendResponse(response, res, {
			handle404: () =>
				res.status(404).json({
					error: 'Session not found or no experiment found for the session',
					details: 'Session not found'
				})
		})
		if (!data) return
		return res.status(200).json(data)
	} catch (error) {
		console.error('Error fetching session summary:', error)
		const apiError = handleApiError(error, 'fetch session summary')
		res.status(500).json(apiError)
	}
}

export default withAuth(handler)
