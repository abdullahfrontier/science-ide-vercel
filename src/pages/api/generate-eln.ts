import {NextApiRequest, NextApiResponse} from 'next'
import {withAuth, getBaseUrl} from '@/lib/auth-middleware'
import {handleBackendResponse} from '@/lib/api-response-handler'

export default withAuth(async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	const {experimentId, orgId, send_email = false} = req.body

	if (!experimentId) {
		return res.status(400).json({error: 'Experiment ID is required'})
	}
	if (!orgId) {
		return res.status(400).json({error: 'Organization ID is required'})
	}

	const baseUrl = getBaseUrl()

	// Create AbortController for 10-minute timeout
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000) // 10 minutes

	try {
		console.log(`Generating ELN for experiment ${experimentId} in org ${orgId}...`)
		// Forward request to backend API
		const response = await fetch(`${baseUrl}/organizations/${encodeURIComponent(orgId)}/experiments/${encodeURIComponent(experimentId)}/generate-eln`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				// Forward the authorization header from the original request
				...(req.headers.authorization && {Authorization: req.headers.authorization})
			},
			body: JSON.stringify({send_email}),
			signal: controller.signal
		})

		// Clear the timeout since request completed
		clearTimeout(timeoutId)

		// For binary responses, we need to handle errors differently than the helper
		if (!response.ok) {
			if (response.status === 404) {
				return res.status(404).json({error: 'Experiment not found'})
			}

			let errorMessage = 'Failed to generate ELN document'
			try {
				const error = await response.json()
				errorMessage = error.detail || error.message || errorMessage
			} catch (e) {
				errorMessage = `Backend request failed with status ${response.status}`
			}

			return res.status(response.status).json({error: errorMessage})
		}

		// Get content headers from backend response
		const contentType = response.headers.get('content-type') || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
		const contentDisposition = response.headers.get('content-disposition') || `attachment; filename="experiment_${experimentId}_eln.docx"`

		// Stream the binary response back to the frontend
		const buffer = await response.arrayBuffer()

		// Set proper headers for file download
		res.setHeader('Content-Type', contentType)
		res.setHeader('Content-Disposition', contentDisposition)
		res.setHeader('Content-Length', buffer.byteLength.toString())

		// Send the binary data
		res.status(200).send(Buffer.from(buffer))

		console.log(`Successfully generated ELN for experiment ${experimentId}`)
	} catch (error) {
		// Clear timeout in case of error
		clearTimeout(timeoutId)

		if ((error as any).name === 'AbortError') {
			console.error(`ELN generation timeout for experiment ${experimentId}`)
			return res.status(504).json({
				error: 'ELN generation timed out. The document may be too large or the backend is experiencing delays. Please try again.'
			})
		}

		console.error('Failed to generate ELN document:', error)
		return res.status(500).json({
			error: 'Failed to generate ELN document',
			details: error instanceof Error ? error.message : 'Unknown error'
		})
	}
})
