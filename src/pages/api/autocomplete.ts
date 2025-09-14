import {NextApiRequest, NextApiResponse} from 'next'
import OpenAI from 'openai'

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
})

function fixSpacing(text: string): string {
	return text
		.replace(/([.?!])(?=\w)/g, '$1 ') // Add space after punctuation if missing
		.replace(/\s+/g, ' ') // Collapse multiple spaces
		.trim()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({error: 'Method not allowed'})
	}

	try {
		const {textBefore, textAfter} = req.body

		// Enhanced logic to prevent over-aggressive suggestions
		const trimmedBefore = textBefore.trim()
		const endsWithSpace = textBefore.endsWith(' ')

		// Don't suggest if text is too short to have meaningful context
		if (trimmedBefore.length < 3) {
			return res.status(200).json({suggestion: null})
		}

		// Don't suggest if text ends with punctuation followed by space (sentence is complete)
		if (trimmedBefore.match(/[.!?]\s*$/) && endsWithSpace) {
			return res.status(200).json({suggestion: null})
		}

		// Determine if we need to add a leading space
		// Add space if: no trailing space AND doesn't already end with whitespace
		const endsWithPunctuation = textBefore.match(/[.!?]$/)
		const needsLeadingSpace = !endsWithSpace && textBefore.length > 0

		const prompt = `
You are an autocomplete engine for a text editor.

Your task:
- Predict and continue the user's text in a natural, contextual, and fluent way.
- Never ask questions or change the conversation's perspective.
- Never repeat text already present.
- Match tone, grammar, and style of existing text.
- Return only the completion text, no quotes or extra words.
- If it's unclear what to write next, return an empty string.

Context:
- Text before cursor: "${textBefore}"
- Text after cursor: "${textAfter}"
`
		try {
			const response = await client.chat.completions.create({
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content: prompt
					}
				],
				temperature: 0.4, // Slightly higher for more creative conversational responses
				max_tokens: 40 // More tokens for complete phrases
			})

			let suggestion = response.choices?.[0]?.message?.content?.trim()

			// Additional client-side filtering and formatting
			if (suggestion) {
				suggestion = fixSpacing(suggestion)
				// Don't suggest if it would repeat recent words
				const recentWords = textBefore.split(/\s+/).slice(-3).join(' ').toLowerCase()
				if (recentWords.includes(suggestion.toLowerCase())) {
					return res.status(200).json({suggestion: null})
				}

				// Don't suggest single characters or very short words unless meaningful
				if (suggestion.length === 1 || (suggestion.length === 2 && !suggestion.match(/^(is|to|in|on|at|be|do|go|no|my|we)$/i))) {
					return res.status(200).json({suggestion: null})
				}

				// Handle spacing: add leading space if needed
				if (needsLeadingSpace && !suggestion.startsWith(' ')) {
					suggestion = ' ' + suggestion
				}
			}

			return res.status(200).json({suggestion: suggestion || null})
		} catch (error) {
			console.error('OpenAI error:', error)
			return res.status(500).json({suggestion: null})
		}
	} catch (error) {
		console.error('Autocomplete API error:', error)
		return res.status(500).json({error: 'Failed to get autocomplete suggestion'})
	}
}
