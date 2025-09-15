'use server'
import type {Alternative} from './CollaborativeEditor'

export async function getAutoCompleteFIMSuggestion(textBefore: string, textAfter: string = ''): Promise<string | null> {
	try {
		const response = await fetch('/api/fim-model', {
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

export async function getAutoCompleteGPTSuggestions(textBefore: string, textAfter: string = ''): Promise<Alternative[]> {
	try {
		const response = await fetch('/api/gpt-model', {
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
		return data.alternatives
	} catch (error) {
		console.error('Autocomplete error:', error)
		return []
	}
}
