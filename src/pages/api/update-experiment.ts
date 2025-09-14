import {NextApiResponse} from 'next'
import {handleApiError} from '../../api/client'
import {handleBackendResponse} from '../../lib/api-response-handler'
import {withAuth, AuthenticatedRequest, getBaseUrl, createAuthHeaders} from '../../lib/auth-middleware'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== 'PUT') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	const {experimentId, title, orgId} = req.body

	if (!experimentId || !title) {
		return res.status(400).json({error: 'Experiment ID and title are required'})
	}

	if (!orgId) {
		return res.status(400).json({error: 'Organization ID is required'})
	}

	try {
		// experimentId is now a string with prefix
		const experimentIdStr = String(experimentId)

		// Make direct call to FastAPI with token
		const baseUrl = getBaseUrl()
		const response = await fetch(`${baseUrl}/organizations/${encodeURIComponent(orgId)}/experiments/${encodeURIComponent(experimentIdStr)}`, {
			method: 'PUT',
			headers: createAuthHeaders(req.token),
			body: JSON.stringify({
				title // Backend accepts 'title' for updates
			})
		})

		const data = await handleBackendResponse(response, res)
		if (!data) return

		res.status(200).json({
			message: 'Experiment updated successfully',
			experiment: data.experiment
		})
	} catch (error) {
		if (error instanceof Error && error.message.includes('not found')) {
			return res.status(404).json({error: 'Experiment not found'})
		}

		const apiError = handleApiError(error, 'update experiment')
		res.status(500).json(apiError)
	}
}

export default withAuth(handler)
