'use server'

import {streamText, CoreMessage} from 'ai'
import {openai} from '@ai-sdk/openai'
import {aiModel, AI_PROVIDER, LOCAL_AI_ENDPOINT} from './config'

/**
 * Stream AI conversation using Vercel AI SDK
 */
export async function continueConversation(messages: CoreMessage[]) {
	if (AI_PROVIDER === 'openai') {
		// Use new streaming API
		const result = await streamText({
			model: openai(aiModel),
			messages
			// Optional: you can add temperature, max tokens, etc.
		})

		return result.toTextStreamResponse() // New v5 streaming response
	} else {
		// Local endpoint (non-streaming)
		const response = await fetch(LOCAL_AI_ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'ngrok-skip-browser-warning': 'true'
			},
			body: JSON.stringify({
				messages,
				stream: false
			})
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
		}

		const data = await response.json()
		const content = data.choices?.[0]?.message?.content || data.content || ''

		return new Response(content)
	}
}

/**
 * Get autocomplete suggestions
 */
/**
 * Get autocomplete suggestions - calls API route instead of direct OpenAI
 */
export async function getAutocompleteSuggestion(textBefore: string, textAfter: string = ''): Promise<string | null> {
	try {
		const response = await fetch('/api/autocomplete', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				textBefore,
				textAfter
			})
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const data = await response.json()
		return data.suggestion
	} catch (error) {
		console.error('Autocomplete error:', error)
		return null
	}
}
