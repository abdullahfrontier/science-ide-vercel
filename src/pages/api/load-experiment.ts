import {NextApiResponse} from 'next'
import {handleApiError} from '../../api/client'
import {handleBackendResponse} from '../../lib/api-response-handler'
import {withAuth, AuthenticatedRequest, getBaseUrl, createAuthHeaders} from '../../lib/auth-middleware'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({error: 'Method not allowed'})
	}
	const {experimentId, org_id} = req.query
	if (!experimentId) {
		return res.status(400).json({error: 'Experiment ID is required'})
	}
	if (!org_id || typeof org_id !== 'string') {
		return res.status(400).json({error: 'Organization ID is required'})
	}
	try {
		// Handle experiment ID from query params
		const experimentIdStr = Array.isArray(experimentId) ? experimentId[0] : experimentId
		const baseUrl = getBaseUrl()
		// 1. Fetch experiment details
		const response = await fetch(`${baseUrl}/organizations/${encodeURIComponent(org_id)}/experiments/${encodeURIComponent(experimentIdStr)}`, {
			method: 'GET',
			headers: createAuthHeaders(req.token)
		})
		const experiment = await handleBackendResponse(response, res, {
			handle404: () => res.status(404).json({error: 'Experiment not found'})
		})
		if (!experiment) {
			return
		}
		// 2. Fetch sessions for this experiment
		let sessions = []
		let experimentalLogs: any[] = []
		let summary = {
			totalSessions: 0,
			totalEntries: 0,
			lastEntry: null as string | null
		}
		try {
			const sessionsResponse = await fetch(`${baseUrl}/organizations/${encodeURIComponent(org_id)}/experiments/${encodeURIComponent(experimentIdStr)}/sessions?limit=10`, {
				method: 'GET',
				headers: createAuthHeaders(req.token)
			})

			if (sessionsResponse.ok) {
				const sessionsData = await sessionsResponse.json()
				sessions = sessionsData.sessions || []
				summary.totalSessions = sessions.length

				// 3. Fetch logs for the most recent sessions (limit to avoid too many requests)
				const recentSessions = sessions.slice(0, 3) // Get logs from the 3 most recent sessions

				const logPromises = recentSessions.map(async (session: any) => {
					try {
						const logsResponse = await fetch(`${baseUrl}/organizations/${encodeURIComponent(org_id)}/experiments/${encodeURIComponent(experimentIdStr)}/sessions/${session.session_id}/logs?limit=20&reverse_chronological_order=true`, {
							method: 'GET',
							headers: createAuthHeaders(req.token)
						})

						if (logsResponse.ok) {
							const logsData = await logsResponse.json()
							return (logsData.logs || []).map((log: any) => ({
								...log,
								sessionUuid: session.session_id,
								session_id: session.session_id
							}))
						}
					} catch (error) {
						console.error(`Failed to fetch logs for session ${session.session_id}:`, error)
					}
					return []
				})

				const logsArrays = await Promise.all(logPromises)
				experimentalLogs = logsArrays.flat()

				// Sort logs by timestamp (most recent first)
				experimentalLogs.sort((a, b) => {
					const timeA = new Date(a.timestamp).getTime()
					const timeB = new Date(b.timestamp).getTime()
					return timeB - timeA
				})

				// Limit to most recent 50 logs for performance
				experimentalLogs = experimentalLogs.slice(0, 50)

				// Calculate summary statistics
				summary.totalEntries = experimentalLogs.length
				if (experimentalLogs.length > 0) {
					summary.lastEntry = experimentalLogs[0].timestamp
				}
			}
		} catch (error) {
			console.error('Failed to fetch sessions or logs:', error)
			// Continue with empty logs if fetch fails
		}
		// Transform the data to match the expected format
		const experimentData = {
			experimentId: experimentIdStr,
			exists: true,
			title: experiment.title || '',
			protocol: experiment.protocol || '',
			created_at: experiment.created_at || '',
			last_modified_by: experiment.last_modified_by || '',
			summary: summary,
			recentSessions: sessions.slice(0, 5), // Include up to 5 recent sessions
			experimentalLogs: experimentalLogs
		}
		return res.status(200).json(experimentData)
	} catch (error) {
		if (error instanceof Error && error.message.includes('not found')) {
			return res.status(404).json({error: 'Experiment not found'})
		}
		const apiError = handleApiError(error, 'load experiment')
		res.status(500).json(apiError)
	}
}

export default withAuth(handler)
