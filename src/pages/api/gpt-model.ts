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

	// Send FULL document context without any limits
	console.log(`[Autocomplete Context] Before: ${textBefore.length} chars (${Math.round(textBefore.length / 6)} words), After: ${textAfter.length} chars (${Math.round(textAfter.length / 6)} words)`)

	const prompt = `You are an intelligent autocomplete assistant. Given the text context, suggest the most likely completion for the current word or phrase. Only return the completion text that should be appended, not the entire sentence.\n\nText before cursor: "${textBefore}"\nText after cursor: "${textAfter}"\n\nRules:\n- If the last word appears incomplete, complete it\n- If the last word is complete and followed by a space, suggest the next likely word or short phrase\n- Keep suggestions concise (1-5 words typically)\n- Match the tone and style of the existing text\n- Return only the text to be inserted, nothing else\n- If no good suggestion, return empty string`

	let altA = ''
	try {
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
		altA = suggestion
		//return res.status(200).json({suggestion})
	} catch (gpt5Error: any) {
		console.log('[GPT-5-mini Error]:', gpt5Error.message)
		console.log('[Autocomplete] gpt-5-mini not available, falling back to gpt-4o-mini')
	}

	let altB = ''
	try {
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

		const suggestion = response.choices?.[0]?.message?.content?.trim() || ''
		altB = suggestion
	} catch (gpt5Error: any) {
		console.log('[GPT-5-mini Error]:', gpt5Error.message)
		console.log('[Autocomplete] gpt-5-mini not available, falling back to gpt-4o-mini')
	}
	return res.status(200).json({
		alternatives: [
			{id: 'A', label: 'Alternative A', text: altA},
			{id: 'B', label: 'Alternative B', text: altB}
		]
	})
}
