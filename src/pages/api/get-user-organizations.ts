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
		const {email} = req.query

		if (!email || typeof email !== 'string') {
			return res.status(400).json({error: 'Email parameter is required'})
		}

		console.log(`[get-user-organizations] Fetching organizations for email: ${email}`)

		// Call backend API to get user's organizations
		const response = await fetch(`${baseUrl}/users/${encodeURIComponent(email)}/organizations`, {
			method: 'GET',
			headers: createAuthHeaders(req.token)
		})

		console.log(`[get-user-organizations] Backend response status: ${response.status}`)

		const data = await handleBackendResponse(response, res, {
			handle404: () => {
				// User not found or has no organizations
				res.status(200).json({organizations: []})
			}
		})

		// If handleBackendResponse returned null (error was handled), return early
		if (!data) {
			return
		}

		// The backend returns organization mappings with org_id but not full details
		// Fetch full organization details for each org_id
		const organizationPromises = (data.organizations || []).map(async (orgMapping: any) => {
			try {
				const orgResponse = await fetch(`${baseUrl}/organizations/${orgMapping.org_id}`, {
					method: 'GET',
					headers: createAuthHeaders(req.token)
				})

				if (orgResponse.ok) {
					const orgDetails = await orgResponse.json()
					return {
						...orgDetails,
						// Include any additional fields from the mapping if needed
						role: orgMapping.role,
						joined_at: orgMapping.joined_at
					}
				}
			} catch (error) {
				// If we can't fetch org details, return minimal info
				console.error(`Failed to fetch org details for ${orgMapping.org_id}:`, error)
			}

			// Fallback if org fetch fails
			return {
				org_id: orgMapping.org_id,
				name: 'Unknown Organization',
				role: orgMapping.role,
				joined_at: orgMapping.joined_at
			}
		})

		const organizations = await Promise.all(organizationPromises)

		res.status(200).json({
			organizations: organizations.filter((org) => org !== null),
			next_key: data.next_key
		})
	} catch (error) {
		const apiError = handleApiError(error, 'fetch user organizations')
		res.status(500).json(apiError)
	}
}

export default withAuth(handler)
