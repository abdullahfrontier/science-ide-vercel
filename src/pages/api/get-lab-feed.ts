import {NextApiRequest, NextApiResponse} from 'next'
import {handleApiError} from '@/api/client'
import {withAuth, AuthenticatedRequest, getBaseUrl, createAuthHeaders} from '../../lib/auth-middleware'
import {handleBackendResponse} from '../../lib/api-response-handler'

interface LabFeedRequest extends AuthenticatedRequest {
	query: {
		org_id?: string
		limit?: string
		max_experiments?: string
		next_key?: string
	}
}

async function handler(req: LabFeedRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	const {org_id, limit, max_experiments, next_key} = req.query

	if (!org_id) {
		return res.status(400).json({error: 'Organization ID is required'})
	}

	try {
		console.log('Making request to FastAPI lab-feed endpoint...')
		const baseUrl = getBaseUrl()

		// Build query parameters
		const params = new URLSearchParams()
		if (limit) params.append('limit', limit)
		if (max_experiments) params.append('max_experiments', max_experiments)
		if (next_key) params.append('next_key', next_key)

		const queryString = params.toString()
		const url = `${baseUrl}/organizations/${org_id}/lab-feed${queryString ? `?${queryString}` : ''}`

		console.log('Lab feed URL:', url)

		const response = await fetch(url, {
			method: 'GET',
			headers: createAuthHeaders(req.token)
		})

		console.log('FastAPI lab-feed response status:', response.status)

		const data = await handleBackendResponse(response, res)

		// If handleBackendResponse returned null (error was handled), return early
		if (!data) {
			return
		}

		console.log('FastAPI lab-feed data:', data)

		// Transform the response to match the frontend's expected format
		// Map feed_items to labFeed and log_id to id
		const transformedData = {
			labFeed: (data.feed_items || []).map((item: any) => ({
				...item,
				id: item.log_id // Map log_id to id for backward compatibility
			})),
			next_key: data.next_key
		}

		// Add cache-control headers to prevent caching issues
		res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
		res.setHeader('Pragma', 'no-cache')
		res.setHeader('Expires', '0')

		res.status(200).json(transformedData)
	} catch (error) {
		const apiError = handleApiError(error, 'fetch lab feed')
		res.status(500).json(apiError)
	}
}

export default withAuth(handler)
