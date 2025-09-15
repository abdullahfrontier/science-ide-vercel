import {NextApiRequest, NextApiResponse} from 'next'
import OpenAI from 'openai'

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
})

// function fixSpacing(text: string): string {
// 	return text
// 		.replace(/([.?!])(?=\w)/g, '$1 ') // Add space after punctuation if missing
// 		.replace(/\s+/g, ' ') // Collapse multiple spaces
// 		.trim()
// }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	try {
		const {textBefore, textAfter} = req.body

		const AI_PROVIDER = 'openai'
		// const AI_ENDPOINT = AI_PROVIDER === 'local' ?
		const LOCAL_AI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'

		// Send FULL document context without any limits
		console.log(`[Autocomplete Context] Before: ${textBefore.length} chars (${Math.round(textBefore.length / 6)} words), After: ${textAfter.length} chars (${Math.round(textAfter.length / 6)} words)`)

		const prompt = `You are an intelligent autocomplete assistant. Given the text context, suggest the most likely completion for the current word or phrase. Only return the completion text that should be appended, not the entire sentence.\n\nText before cursor: "${textBefore}"\nText after cursor: "${textAfter}"\n\nRules:\n- If the last word appears incomplete, complete it\n- If the last word is complete and followed by a space, suggest the next likely word or short phrase\n- Keep suggestions concise (1-5 words typically)\n- Match the tone and style of the existing text\n- Return only the text to be inserted, nothing else\n- If no good suggestion, return empty string`

		// Use GPT-5-mini with the OpenAI SDK
		const useGpt5Mini = AI_PROVIDER === 'openai' && true // Toggle this to enable/disable GPT-5-mini

		if (useGpt5Mini) {
			try {
				// Use OpenAI SDK for GPT-5-mini
				// const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY})

				const response = await client.responses.create({
					model: 'gpt-5-mini',
					instructions: `You are an intelligent autocomplete assistant. Given the text context, suggest the most likely completion for the current word or phrase. Only return the completion text that should be appended, not the entire sentence.

	Rules:
	- If the last word appears incomplete, complete it
	- If the last word is complete and followed by a space, suggest the next likely word or short phrase
	- Keep suggestions concise (1-5 words typically)
	- Match the tone and style of the existing text
	- Return only the text to be inserted, nothing else
	- If no good suggestion, return empty string`,
					input: `Text before cursor: "${textBefore}"\nText after cursor: "${textAfter}"`
				})

				console.log('[GPT-5-mini SDK Response]:', response)
				const suggestion = response.output_text?.trim()
				console.log('[GPT-5-mini Extracted Suggestion]:', suggestion)
				return res.status(200).json({suggestion})
			} catch (gpt5Error: any) {
				console.log('[GPT-5-mini Error]:', gpt5Error.message)
				console.log('[Autocomplete] gpt-5-mini not available, falling back to gpt-4o-mini')

				// Fallback to gpt-4o-mini using standard chat completions
				// const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY})
				const response = await client.chat.completions.create({
					model: 'gpt-4o-mini',
					messages: [
						{
							role: 'system',
							content: prompt
						}
					],
					temperature: 1.0,
					max_tokens: 200
				})

				const suggestion = response.choices?.[0]?.message?.content?.trim()
				console.log('[Fallback to gpt-4o-mini] Extracted Suggestion:', suggestion)
				return res.status(200).json({suggestion})
			}
		} else if (AI_PROVIDER === 'openai') {
			// Use standard OpenAI chat completions for non-GPT-5 models
			// const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY})
			const response = await client.chat.completions.create({
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content: prompt
					}
				],
				temperature: 1.0,
				max_tokens: 200
			})

			const suggestion = response.choices?.[0]?.message?.content?.trim()
			return res.status(200).json({suggestion})
		} else {
			// Local endpoint fallback
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
							content: prompt
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
			const suggestion = data.choices?.[0]?.message?.content?.trim() || data.content?.trim()
			return res.status(200).json({suggestion})
		}
	} catch (error) {
		console.error('Autocomplete error:', error)
		return null
	}
}
