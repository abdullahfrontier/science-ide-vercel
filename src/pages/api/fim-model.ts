import {NextApiRequest, NextApiResponse} from 'next'
import OpenAI from 'openai'

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	const {textBefore, textAfter} = req.body

	const prompt1 = `You are an intelligent autocomplete assistant. Given the text context, suggest the most likely completion for the current word or phrase. Only return the completion text that should be appended, not the entire sentence.\n\nText before cursor: "${textBefore}"\nText after cursor: "${textAfter}"\n\nRules:\n- If the last word appears incomplete, complete it\n- If the last word is complete and followed by a space, suggest the next likely word or short phrase\n- Keep suggestions concise (1-5 words typically)\n- Match the tone and style of the existing text\n- Return only the text to be inserted, nothing else\n- If no good suggestion, return empty string`

	const AI_PROVIDER = 'openai'
	// const AI_ENDPOINT = AI_PROVIDER === 'local' ?
	const LOCAL_AI_ENDPOINT = 'https://6eeb0347f0e9.ngrok-free.app/api/chat'

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'ngrok-skip-browser-warning': 'true'
	}

	const response = await fetch(LOCAL_AI_ENDPOINT, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			messages: [
				{
					role: 'system',
					content: prompt1
				}
			],
			stream: false,
			temperature: 1.0,
			max_tokens: 200
		})
	})

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`)
	}

	const data = await response.json()
	const suggestion = data.choices?.[0]?.message?.content?.trim() || data.content?.trim() || null

	return res.status(200).json({suggestion})
}
