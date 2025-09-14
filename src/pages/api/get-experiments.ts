import {NextApiResponse} from 'next'
import {handleApiError} from '../../api/client'
import {withAuth, AuthenticatedRequest, getBaseUrl, createAuthHeaders} from '../../lib/auth-middleware'
import {handleBackendResponse} from '../../lib/api-response-handler'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	const baseUrl = getBaseUrl()

	try {
		const {org_id} = req.query

		if (!org_id || typeof org_id !== 'string') {
			return res.status(400).json({error: 'Organization ID is required'})
		}

		const url = `${baseUrl}/organizations/${encodeURIComponent(org_id)}/experiments`

		const response = await fetch(url, {
			method: 'GET',
			headers: createAuthHeaders(req.token)
		})

		const data = await handleBackendResponse(response, res)

		// If handleBackendResponse returned null (error was handled), return early
		if (!data) {
			return
		}

		// Transform response to match frontend expectations
		res.status(200).json({
			experiments: data.experiments || [],
			next_key: data.next_key
		})
	} catch (error) {
		const apiError = handleApiError(error, 'fetch experiments')
		res.status(500).json(apiError)
	}
}

export default withAuth(handler)
