import {NextApiResponse} from 'next'
import {handleApiError} from '../../api/client'
import {withAuth, AuthenticatedRequest, getBaseUrl, createAuthHeaders} from '../../lib/auth-middleware'
import {handleBackendResponse} from '../../lib/api-response-handler'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	const baseUrl = getBaseUrl()

	try {
		const {name} = req.body

		if (!name || typeof name !== 'string' || !name.trim()) {
			return res.status(400).json({error: 'Organization name is required'})
		}

		// Call backend API to create organization
		const response = await fetch(`${baseUrl}/organizations`, {
			method: 'POST',
			headers: createAuthHeaders(req.token),
			body: JSON.stringify({
				name: name.trim()
			})
		})

		// Handle special case for 409 Conflict
		if (response.status === 409) {
			return res.status(409).json({error: 'Organization with this name already exists'})
		}

		const organization = await handleBackendResponse(response, res)

		// If handleBackendResponse returned null (error was handled), return early
		if (!organization) {
			return
		}

		// No transformation needed - using 'name' field directly
		res.status(201).json({
			message: 'Organization created successfully',
			organization: organization
		})
	} catch (error) {
		const apiError = handleApiError(error, 'create organization')
		res.status(500).json(apiError)
	}
}

export default withAuth(handler)
