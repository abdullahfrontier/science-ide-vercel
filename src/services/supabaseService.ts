const SUPABASE_FUNCTION_URL = 'https://cpvxmvvgswjxzerdbgmb.supabase.co/functions/v1/processDocumentForAction'

export interface ProcessDocumentRequest {
	action: 'critiqueProtocol' | 'generateDataTable' | 'reproducibilityCheck'
	document: string
	title: string
}

export interface ProcessDocumentResponse {
	result: string
	success: boolean
	error?: string
}

export async function performOpenAIAction(action: ProcessDocumentRequest['action'], document: string, title: string): Promise<ProcessDocumentResponse> {
	try {
		console.log('Calling Supabase function with:', {
			action,
			title,
			documentLength: document.length
		})

		const response = await fetch(SUPABASE_FUNCTION_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({
				action,
				document,
				title
			})
		})

		console.log('Response status:', response.status)
		console.log('Response headers:', response.headers)

		const responseText = await response.text()
		console.log('Response text:', responseText)

		if (!response.ok) {
			let errorMessage = `API Error (${response.status})`

			// Try to parse error response for more specific message
			try {
				const errorData = JSON.parse(responseText)
				errorMessage = errorData.error || errorData.message || errorMessage
			} catch {
				// If not JSON, use response text or status text
				errorMessage = responseText || response.statusText || errorMessage
			}

			throw new Error(errorMessage)
		}

		try {
			const data = JSON.parse(responseText)

			// Handle different response formats
			let resultText = ''
			if (typeof data === 'string') {
				resultText = data
			} else if (data.dataTable && typeof data.dataTable === 'string') {
				resultText = data.dataTable
			} else if (data.result && typeof data.result === 'string') {
				resultText = data.result
			} else if (data.message && typeof data.message === 'string') {
				resultText = data.message
			} else if (data.text && typeof data.text === 'string') {
				resultText = data.text
			} else if (data.content && typeof data.content === 'string') {
				resultText = data.content
			} else {
				// If it's an object, stringify it
				resultText = JSON.stringify(data, null, 2)
			}

			return {
				result: resultText,
				success: true,
				error: undefined
			}
		} catch (parseError) {
			// If response is not JSON, return it as is
			return {
				result: responseText,
				success: true,
				error: undefined
			}
		}
	} catch (error) {
		console.error('Error calling Supabase function:', error)

		// Categorize different types of errors for better user experience
		if (error instanceof TypeError && error.message === 'Failed to fetch') {
			return {
				result: '',
				success: false,
				error: 'Network error: Unable to connect to the API. Please check your internet connection or try again later.'
			}
		}

		// Handle timeout errors
		if (error instanceof Error && error.message.includes('timeout')) {
			return {
				result: '',
				success: false,
				error: 'Request timeout: The operation took too long to complete. Please try with a shorter document or try again later.'
			}
		}

		// Handle rate limiting
		if (error instanceof Error && error.message.includes('429')) {
			return {
				result: '',
				success: false,
				error: 'Rate limit exceeded: Too many requests. Please wait a moment and try again.'
			}
		}

		// Handle authentication errors
		if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
			return {
				result: '',
				success: false,
				error: 'Authentication error: The API request was not authorized. Please contact support if this persists.'
			}
		}

		return {
			result: '',
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred'
		}
	}
}
