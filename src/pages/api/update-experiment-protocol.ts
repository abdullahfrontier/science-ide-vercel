import {NextApiResponse} from 'next'
import {handleApiError} from '../../api/client'
import {handleBackendResponse} from '../../lib/api-response-handler'
import {withAuth, AuthenticatedRequest, getBaseUrl, createAuthHeaders} from '../../lib/auth-middleware'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== 'PUT') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	const {experimentId, protocol, orgId} = req.body

	if (!experimentId) {
		return res.status(400).json({error: 'Experiment ID is required'})
	}

	if (protocol === undefined || protocol === null) {
		return res.status(400).json({error: 'Protocol field is required'})
	}

	if (!orgId) {
		return res.status(400).json({error: 'Organization ID is required'})
	}

	try {
		// experimentId is a string with prefix
		const experimentIdStr = String(experimentId)

		// Make direct call to FastAPI with token
		const baseUrl = getBaseUrl()
		const response = await fetch(`${baseUrl}/organizations/${encodeURIComponent(orgId)}/experiments/${encodeURIComponent(experimentIdStr)}/protocol`, {
			method: 'PUT',
			headers: createAuthHeaders(req.token),
			body: JSON.stringify({
				protocol: protocol
			})
		})

		const data = await handleBackendResponse(response, res)
		if (!data) return

		res.status(200).json({
			message: data.message || 'Protocol updated successfully'
		})
	} catch (error) {
		if (error instanceof Error && error.message.includes('not found')) {
			return res.status(404).json({error: 'Experiment not found'})
		}

		const apiError = handleApiError(error, 'update experiment protocol')
		res.status(500).json(apiError)
	}
}

export default withAuth(handler)
