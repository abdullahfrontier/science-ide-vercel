import {NextApiResponse} from 'next'
import {handleApiError} from '../../api/client'
import {handleBackendResponse} from '../../lib/api-response-handler'
import {withAuth, AuthenticatedRequest, getBaseUrl, createAuthHeaders} from '../../lib/auth-middleware'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({error: 'Method not allowed'})
	}
	const {title, protocol, orgId} = req.body
	try {
		const baseUrl = getBaseUrl()
		const response = await fetch(`${baseUrl}/organizations/${encodeURIComponent(orgId)}/experiments`, {
			method: 'POST',
			headers: createAuthHeaders(req.token),
			body: JSON.stringify({
				title,
				protocol
			})
		})
		const data = await handleBackendResponse(response, res)
		if (!data) return
		res.status(201).json({
			message: data.message || 'Experiment registered successfully',
			experiment_id: data.experiment_id
		})
	} catch (error) {
		const apiError = handleApiError(error, 'register experiment')
		res.status(500).json(apiError)
	}
}

export default withAuth(handler)

export const config = {
	api: {
		bodyParser: {
			sizeLimit: '10mb'
		}
	}
}
