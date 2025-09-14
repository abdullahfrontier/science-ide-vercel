import {NextApiResponse} from 'next'
import {withAuth, AuthenticatedRequest, getBaseUrl, createAuthHeaders} from '@/lib/auth-middleware'
import {handleApiError} from '@/api/client'
import {handleBackendResponse} from '@/lib/api-response-handler'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== 'PUT') {
		return res.status(405).json({error: 'Method not allowed'})
	}
	const {email, name} = req.body
	try {
		const baseUrl = getBaseUrl()
		const response = await fetch(`${baseUrl}/users/${encodeURIComponent(email)}`, {
			method: 'PUT',
			headers: createAuthHeaders(req.token),
			body: JSON.stringify({
				name: name.trim()
			})
		})

		const data = await handleBackendResponse(response, res)
		if (!data) return

		res.status(200).json({
			message: data.message || 'Profile updated successfully',
			success: true
		})
	} catch (error) {
		const apiError = handleApiError(error, 'update user profile')
		res.status(500).json(apiError)
	}
}

export default withAuth(handler)
