export interface CritiqueRatings {
	impact: 'High' | 'Medium' | 'Low'
	effort: 'High' | 'Medium' | 'Low'
	practicality: 'High' | 'Medium' | 'Low'
	type: string
}

export interface CritiqueItem {
	id: string
	text: string
	tracked: boolean
	ratings?: CritiqueRatings
}

export interface CritiqueSection {
	type: 'general' | 'covariates'
	title: string
	items: CritiqueItem[]
}

export interface ParsedCritique {
	sections: CritiqueSection[]
	rawText?: string
}

// Helper function to extract ratings from text
function extractRatings(text: string): {cleanText: string; ratings?: CritiqueRatings} {
	const ratingRegex = /#(Impact|Effort|Practicality):\s*(High|Medium|Low)/gi
	const typeRegex = /#Type:\s*([^,#\n]+)/gi
	const ratings: Partial<CritiqueRatings> = {}
	let cleanText = text

	// Extract Impact, Effort, Practicality ratings
	let match
	while ((match = ratingRegex.exec(text)) !== null) {
		const [fullMatch, category, level] = match
		const key = category.toLowerCase() as keyof CritiqueRatings
		ratings[key] = level as 'High' | 'Medium' | 'Low'
		cleanText = cleanText.replace(fullMatch, '').trim()
	}

	// Extract Type
	const typeMatch = typeRegex.exec(text)
	if (typeMatch) {
		ratings.type = typeMatch[1].trim()
		cleanText = cleanText.replace(typeMatch[0], '').trim()
	}

	// Clean up any extra spaces or commas
	cleanText = cleanText.replace(/,\s*$/, '').replace(/\s+/g, ' ').trim()

	const hasRequiredRatings = ratings.impact && ratings.effort && ratings.practicality

	return {
		cleanText,
		ratings: hasRequiredRatings ? (ratings as CritiqueRatings) : undefined
	}
}

export function parseCritiqueResponse(rawResponse: string): ParsedCritique {
	try {
		let text = rawResponse

		// Remove any JSON formatting if present
		try {
			const parsed = JSON.parse(rawResponse)
			text = parsed.critique || parsed.result || parsed.message || parsed.text || rawResponse
		} catch {
			// Not JSON, use as is
		}

		// Clean up common formatting issues
		text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim()

		const sections: CritiqueSection[] = []

		// Split by headers starting with #### or ###
		const headerRegex = /^(#{3,4})\s+(.+)$/gm
		const parts: Array<{title: string; content: string; startIndex?: number}> = []
		let lastIndex = 0
		let match: RegExpExecArray | null

		while ((match = headerRegex.exec(text)) !== null) {
			if (lastIndex > 0) {
				// Add previous section
				const sectionText = text.substring(lastIndex, match.index).trim()
				parts.push({title: parts[parts.length - 1]?.title || '', content: sectionText})
			}

			parts.push({title: match[2].trim(), content: '', startIndex: match.index + match[0].length})
			lastIndex = match.index + match[0].length
		}

		// Add the last section
		if (parts.length > 0) {
			const lastSection = parts[parts.length - 1]
			lastSection.content = text.substring(lastIndex).trim()
		}

		// Process each section
		for (const part of parts) {
			if (!part.content) continue

			// Extract numbered items using a more robust regex
			const items: CritiqueItem[] = []
			const itemRegex = /(\d+)\.\s+([^]+?)(?=\n\d+\.\s+|\n#{3,4}|$)/g
			let itemMatch: RegExpExecArray | null

			while ((itemMatch = itemRegex.exec(part.content)) !== null) {
				const rawText = itemMatch[2].trim()
				const {cleanText, ratings} = extractRatings(rawText)

				items.push({
					id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					text: cleanText,
					tracked: false,
					ratings
				})
			}

			// If no numbered items found, try line-by-line approach
			if (items.length === 0) {
				const lines = part.content.split('\n').filter((line) => line.trim())
				for (const line of lines) {
					const match = line.match(/^\d+\.\s+(.+)$/)
					if (match) {
						const rawText = match[1].trim()
						const {cleanText, ratings} = extractRatings(rawText)

						items.push({
							id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
							text: cleanText,
							tracked: false,
							ratings
						})
					}
				}
			}

			if (items.length === 0) continue

			// Determine section type based on title
			let type: 'general' | 'covariates' = 'general'
			if (part.title.toLowerCase().includes('covariate') || part.title.toLowerCase().includes('variable') || part.title.toLowerCase().includes('factor')) {
				type = 'covariates'
			}

			sections.push({
				type,
				title: part.title,
				items
			})
		}

		return {sections}
	} catch (error) {
		console.error('Error parsing critique response:', error)
		return {
			sections: [],
			rawText: rawResponse
		}
	}
}

// Keep the old function for backward compatibility
export function formatCritiqueResponse(rawResponse: string): string {
	const parsed = parseCritiqueResponse(rawResponse)

	if (parsed.rawText) {
		return parsed.rawText
	}

	return parsed.sections
		.map((section) => {
			const header = `### ${section.title}`
			const items = section.items.map((item, index) => `${index + 1}. ${item.text}`)
			return [header, ...items].join('\n')
		})
		.join('\n\n')
}

export function formatReproducibilityResponse(rawResponse: string): string {
	// Similar formatting for reproducibility checks
	let text = rawResponse
	try {
		const parsed = JSON.parse(rawResponse)
		text = parsed.result || parsed.message || parsed.text || rawResponse
	} catch {
		// Not JSON, use as is
	}

	text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\/g, '').trim()

	// Enhanced formatting for reproducibility checks
	const formattedText = text
		.replace(/Missing:/gi, '\n📋 Missing:')
		.replace(/Present:/gi, '\n✅ Present:')
		.replace(/Available:/gi, '\n✅ Available:')
		.replace(/Included:/gi, '\n✅ Included:')
		.replace(/Suggestions:/gi, '\n💡 Suggestions:')
		.replace(/Issues:/gi, '\n⚠️ Issues:')
		.replace(/Problems:/gi, '\n🚨 Problems:')
		.replace(/Recommendations:/gi, '\n🎯 Recommendations:')
		.replace(/Required:/gi, '\n📝 Required:')
		.replace(/Needed:/gi, '\n📝 Needed:')
		.replace(/Documentation:/gi, '\n📚 Documentation:')
		.replace(/Data:/gi, '\n💾 Data:')
		.replace(/Methods?:/gi, '\n🔬 Methods:')
		.replace(/Materials?:/gi, '\n🧪 Materials:')
		.replace(/Steps?:/gi, '\n📋 Steps:')
		.replace(/Procedures?:/gi, '\n🔄 Procedures:')
		.replace(/(\d+\.\s*)(.*)/g, '🔸 $1$2') // Number lists
		.replace(/•\s*(.*)/g, '• $1') // Bullet points
		.replace(/^\s*-\s*(.*)/gm, '• $1') // Dashes to bullets

	return formattedText
}

export interface ReproducibilityRow {
	id: string
	step: string
	issue: string
	whyItMatters: string
	suggestedFix: string
	userInput: string
}

export function parseReproducibilityResponse(rawResponse: string): ReproducibilityRow[] {
	try {
		let cleanResponse = rawResponse.trim()

		// Handle JSON response first
		try {
			const parsed = JSON.parse(cleanResponse)
			cleanResponse = parsed.critique || parsed.result || parsed.message || parsed.text || cleanResponse
		} catch {
			// Not JSON, continue with string parsing
		}

		// Clean up common formatting issues
		cleanResponse = cleanResponse
			.replace(/```[\w]*\n?/g, '') // Remove code block markers
			.replace(/^#+\s*.*$/gm, '') // Remove markdown headers
			.trim()

		// Find the table in the response
		const lines = cleanResponse.split('\n')
		const tableLines = lines.filter((line) => line.includes('|') && line.trim().length > 0)

		if (tableLines.length < 2) {
			return []
		}

		// Process markdown table lines
		const processedLines = tableLines.map((line) => {
			return line
				.trim()
				.replace(/^\|/, '') // Remove leading pipe
				.replace(/\|$/, '') // Remove trailing pipe
				.split('|')
				.map((cell) => cell.trim())
		})

		// Filter out separator lines (like |---|---|)
		const validLines = processedLines.filter((line) => !line.every((cell) => /^[-\s:]*$/.test(cell)))

		if (validLines.length < 2) {
			return []
		}

		// Verify we have the expected columns (now 4 columns)
		const headers = validLines[0]
		const expectedHeaders = ['step', 'issue', 'why it matters', 'suggested fix']

		// Check if headers match expected structure (case-insensitive)
		const headersMatch = headers.length >= 4 && expectedHeaders.every((expected) => headers.some((header) => header.toLowerCase().includes(expected)))

		if (!headersMatch) {
			return []
		}

		// Parse data rows
		const dataRows = validLines.slice(1)
		return dataRows
			.map((row, index) => ({
				id: `row-${Date.now()}-${index}`,
				step: row[0] || '',
				issue: row[1] || '',
				whyItMatters: row[2] || '',
				suggestedFix: row[3] || '',
				userInput: '' // Initialize empty for user input
			}))
			.filter((row) => row.step.trim() !== '') // Filter out empty rows
	} catch (error) {
		console.error('Error parsing reproducibility data:', error)
		return []
	}
}

export function parseDataTableResponse(rawResponse: string): {headers: string[]; rows: string[][]} | null {
	try {
		let data
		let cleanResponse = rawResponse.trim()

		// Clean up common formatting issues in AI responses
		cleanResponse = cleanResponse
			.replace(/```[\w]*\n?/g, '') // Remove code block markers
			.replace(/^\s*Table:\s*/i, '') // Remove "Table:" prefix
			.replace(/^\s*Data Table:\s*/i, '') // Remove "Data Table:" prefix
			.replace(/^#+\s*.*Table.*$/gm, '') // Remove markdown headers like "#### Data Variables Table"
			.replace(/^#+\s*.*$/gm, '') // Remove any other markdown headers
			.trim()

		// Try to parse as JSON first
		try {
			const parsed = JSON.parse(cleanResponse)
			data = parsed.dataTable || parsed.result || parsed.table || parsed.data || parsed
		} catch {
			// If not JSON, try various text formats

			// Try markdown table format first
			const lines = cleanResponse.split('\n')
			const tableLines = lines.filter((line) => line.includes('|') && line.trim().length > 0)

			if (tableLines.length >= 2) {
				// Process markdown table lines
				const processedLines = tableLines.map((line) => {
					// Remove leading/trailing pipes and split
					return line
						.trim()
						.replace(/^\|/, '') // Remove leading pipe
						.replace(/\|$/, '') // Remove trailing pipe
						.split('|')
						.map((cell) => cell.trim())
				})

				// Filter out separator lines (like |---|---|)
				const validLines = processedLines.filter((line) => !line.every((cell) => /^[-\s:]*$/.test(cell)))

				if (validLines.length >= 2) {
					return {
						headers: validLines[0],
						rows: validLines.slice(1)
					}
				}
			}

			// Try CSV/TSV format
			const csvLines = cleanResponse.split('\n').filter((line) => line.trim())
			if (csvLines.length >= 2) {
				// Detect separator (comma, tab, or pipe)
				const firstLine = csvLines[0]
				let separator = ','
				if (firstLine.includes('\t')) separator = '\t'
				else if (firstLine.includes('|')) separator = '|'
				else if (firstLine.includes(';')) separator = ';'

				const headers = csvLines[0].split(separator).map((h) => h.trim().replace(/^["']|["']$/g, ''))
				const rows = csvLines.slice(1).map((line) => line.split(separator).map((cell) => cell.trim().replace(/^["']|["']$/g, '')))

				// Validate that all rows have the same number of columns as headers
				const validRows = rows.filter((row) => row.length === headers.length)

				if (headers.length > 0 && validRows.length > 0) {
					return {headers, rows: validRows}
				}
			}

			return null
		}

		// Handle different JSON table formats
		if (Array.isArray(data)) {
			if (data.length === 0) return null

			// If array of objects
			if (typeof data[0] === 'object' && data[0] !== null) {
				const headers = Object.keys(data[0])
				const rows = data.map((item) => headers.map((header) => String(item[header] || '')))
				return {headers, rows}
			}

			// If array of arrays
			if (Array.isArray(data[0])) {
				if (data.length < 2) return null
				return {
					headers: data[0].map(String),
					rows: data.slice(1).map((row) => row.map(String))
				}
			}
		}

		// If object with headers and rows
		if (data && typeof data === 'object') {
			if (data.headers && data.rows) {
				return {
					headers: data.headers.map(String),
					rows: data.rows.map((row: any[]) => row.map(String))
				}
			}

			// If object with columns
			if (data.columns && Array.isArray(data.columns)) {
				const headers = data.columns.map((col: any) => (typeof col === 'object' ? col.name || col.title || col.header || String(col) : String(col)))
				const rows = data.data || data.rows || []
				return {headers, rows: rows.map((row: any[]) => row.map(String))}
			}
		}

		return null
	} catch (error) {
		console.error('Error parsing table data:', error)
		return null
	}
}
