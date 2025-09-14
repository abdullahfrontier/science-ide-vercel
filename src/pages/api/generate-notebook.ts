import {NextApiResponse} from 'next'
import OpenAI from 'openai'
import {handleApiError} from '../../api/client'
import {handleBackendResponse} from '../../lib/api-response-handler'
import {withAuth, AuthenticatedRequest, getBaseUrl, createAuthHeaders} from '../../lib/auth-middleware'

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
})

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	const {experimentId} = req.body

	if (!experimentId) {
		return res.status(400).json({error: 'Experiment ID is required'})
	}

	if (!process.env.OPENAI_API_KEY) {
		return res.status(500).json({error: 'OpenAI API key not configured'})
	}

	try {
		// Get experiment data from the backend API
		const baseUrl = getBaseUrl()
		let experimentApiData
		try {
			const response = await fetch(`${baseUrl}/experiment/${parseInt(experimentId.toString())}`, {
				method: 'GET',
				headers: createAuthHeaders(req.token)
			})

			experimentApiData = await handleBackendResponse(response, res, {
				handle404: () => res.status(404).json({error: 'Experiment not found'})
			})
			if (!experimentApiData) return
		} catch (error) {
			if (error instanceof Error && error.message.includes('not found')) {
				return res.status(404).json({error: 'Experiment not found'})
			}
			throw error
		}

		// Get all logs with conversation entries
		const logsResponse = await fetch(`${baseUrl}/logs?experiment_id=${parseInt(experimentId.toString())}&limit=1000`, {
			method: 'GET',
			headers: createAuthHeaders(req.token)
		})

		const logsData = await handleBackendResponse(logsResponse, res)
		if (!logsData) return
		const allLogs = logsData.logs || []

		// Filter conversation entries
		const conversationEntries = allLogs.filter((log: any) => ['user', 'assistant'].includes(log.speaker)).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

		// Group by session to calculate session stats
		const sessionStats: {[key: string]: any} = {}
		allLogs.forEach((log: any) => {
			const sessionUuid = log.session_uuid
			if (!sessionStats[sessionUuid]) {
				sessionStats[sessionUuid] = {
					sessionUuid,
					entries: [],
					userEntries: 0,
					agentEntries: 0,
					totalEntries: 0
				}
			}
			sessionStats[sessionUuid].entries.push(log)
			sessionStats[sessionUuid].totalEntries++
			if (log.speaker === 'user') {
				sessionStats[sessionUuid].userEntries++
			} else if (log.speaker === 'assistant') {
				sessionStats[sessionUuid].agentEntries++
			}
		})

		// Convert session stats to array and add timestamps
		const sessions = Object.values(sessionStats).map((session: any) => {
			const sortedEntries = session.entries.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
			return {
				sessionUuid: session.sessionUuid,
				sessionStart: sortedEntries[0]?.timestamp,
				sessionEnd: sortedEntries[sortedEntries.length - 1]?.timestamp,
				entryCount: session.totalEntries,
				userEntries: session.userEntries,
				agentEntries: session.agentEntries
			}
		})

		// Prepare data for OpenAI
		const experimentData = {
			experimentId: experimentId.toString(),
			protocol: experimentApiData.experiment?.protocol || 'No protocol found',
			saveLocation: experimentApiData.experiment?.save_location || '',
			experimentUuid: experimentApiData.experiment?.uuid || '',
			summary: experimentApiData.summary || {
				totalEntries: 0,
				userEntries: 0,
				agentEntries: 0,
				totalSessions: 0,
				firstEntry: null,
				lastEntry: null,
				activityRate: 0
			},
			sessions: sessions,
			conversations: conversationEntries.map((entry: any) => ({
				speaker: entry.speaker,
				content: entry.content,
				timestamp: entry.timestamp,
				sessionUuid: entry.session_uuid,
				assistantActive: entry.assistant_active,
				uuid: entry.uuid
			}))
		}

		// Generate markdown using OpenAI
		const prompt = `You are a research assistant creating a comprehensive experimental notebook. Based on the following experimental data, create a well-structured markdown document that analyzes and summarizes the experiment.

Experiment Data:
${JSON.stringify(experimentData, null, 2)}

Please create a markdown document that includes:

1. **Executive Summary** - Brief overview of the experiment
2. **Experiment Details** - Protocol, duration, and key parameters
3. **Quantitative Analysis** - Statistics about interactions, sessions, and engagement
4. **Session Analysis** - Breakdown of each session with key insights
5. **Conversation Highlights** - Important or interesting exchanges
6. **Patterns and Insights** - Observations about user behavior and agent performance
7. **Conclusions** - Key takeaways and recommendations

Format the output as clean markdown with proper headers, bullet points, and tables where appropriate. Make it professional and suitable for scientific documentation.

Focus on providing meaningful insights rather than just listing data. Analyze patterns, engagement levels, and the effectiveness of the experimental setup.`

		const completion = await openai.chat.completions.create({
			model: 'gpt-4',
			messages: [
				{
					role: 'system',
					content: 'You are a research assistant specialized in creating scientific experimental notebooks. Generate comprehensive, insightful, and well-structured markdown documents.'
				},
				{
					role: 'user',
					content: prompt
				}
			],
			max_tokens: 4000,
			temperature: 0.3
		})

		const markdown = completion.choices[0]?.message?.content || 'Failed to generate notebook content'

		return res.status(200).json({
			markdown,
			experimentData: {
				experimentId: experimentData.experimentId,
				totalSessions: experimentData.summary.totalSessions,
				totalEntries: experimentData.summary.totalEntries
			}
		})
	} catch (error) {
		const apiError = handleApiError(error, 'generate notebook')
		res.status(500).json(apiError)
	}
}

export default withAuth(handler)
