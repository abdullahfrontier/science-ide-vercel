import {NextApiResponse} from 'next'
import {handleApiError} from '@/api/client'
import {handleBackendResponse} from '../../lib/api-response-handler'
import {withAuth, AuthenticatedRequest, getBaseUrl, createAuthHeaders} from '../../lib/auth-middleware'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	const {orgId, email} = req.body

	if (!orgId) {
		return res.status(400).json({error: 'Organization ID is required'})
	}

	if (!email) {
		return res.status(400).json({error: 'User email is required'})
	}

	try {
		const baseUrl = getBaseUrl()
		const response = await fetch(`${baseUrl}/organizations/${encodeURIComponent(orgId)}/users?email_id=${encodeURIComponent(email)}`, {
			method: 'POST',
			headers: createAuthHeaders(req.token)
		})

		const data = await handleBackendResponse(response, res)
		if (!data) return

		res.status(200).json({
			message: data.message || `User ${email} added to organization successfully`,
			success: true
		})
	} catch (error) {
		const apiError = handleApiError(error, 'add user to organization')
		res.status(500).json(apiError)
	}
}

export default withAuth(handler)
