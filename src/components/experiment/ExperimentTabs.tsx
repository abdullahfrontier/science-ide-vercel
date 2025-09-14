import React, {useState, useEffect, useRef, useCallback} from 'react'
import {Tabs, Card, Empty, Typography, Space, Spin, Alert, Button, message, List} from 'antd'
import {FileTextOutlined, TableOutlined, UnorderedListOutlined, ExclamationCircleOutlined, FileWordOutlined, ExperimentOutlined} from '@ant-design/icons'
// Using Mammoth.js DocumentViewer for Word document rendering
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import {DataTable} from '../../services/documentService'
import {DataTableWrapper} from './DataTableWrapper'
import {performOpenAIAction} from '../../services/supabaseService'
import {parseDataTableResponse} from '../../utils/formatters'
import {DocumentViewer} from './DocumentViewer'
import {palette} from '@/styles/color'

const {Title, Text} = Typography

import {useSelector} from 'react-redux'
import {RootState} from '@/store'
import {doLoadExperiment, doGenerateELN} from '@/api'

interface ExperimentTabsProps {
	onRowComplete?: (csvRow: string) => void
	experimentId?: string | null
	onSessionStart?: () => void
}

export const ExperimentTabs = ({onRowComplete, experimentId: propExperimentId, onSessionStart}: ExperimentTabsProps = {}) => {
	const {currentOrganization, currentExperimentId} = useSelector((state: RootState) => state.auth)

	const [markdown, setMarkdown] = useState<string>('')
	const [isLoading, setIsLoading] = useState<boolean>(true)
	const [error, setError] = useState<string | null>(null)
	const [experimentId, setExperimentId] = useState<string | null>(null)
	const [activeTab, setActiveTab] = useState<string>('summary')
	const [isGeneratingTable, setIsGeneratingTable] = useState<boolean>(false)
	const [elnWordUrl, setElnWordUrl] = useState<string>('')
	const [isGeneratingEln, setIsGeneratingEln] = useState<boolean>(false)
	const [isDownloading, setIsDownloading] = useState<boolean>(false)
	const [elnGenerated, setElnGenerated] = useState<boolean>(false)

	const [selectedExperiment, setSelectedExperiment] = useState<any>(null)

	const [dataTable, setDataTable] = useState<DataTable>({
		id: 'experiment-data-table',
		title: 'Experiment Data',
		headers: ['Parameter', 'Value', 'Units'],
		rows: [
			['Temperature', '', '°C'],
			['Pressure', '', 'bar'],
			['Time', '', 'min']
		]
	})

	// New state for parsed content sections
	const [summaryContent, setSummaryContent] = useState<string>('')
	const [materialsContent, setMaterialsContent] = useState<string>('')
	const [protocolContent, setProtocolContent] = useState<string>('')
	const [tableContent, setTableContent] = useState<string>('')
	const [materialsList, setMaterialsList] = useState<string[]>([])
	const [protocolSteps, setProtocolSteps] = useState<Array<{number: string; content: string}>>([])
	const [hierarchicalSteps, setHierarchicalSteps] = useState<
		Array<{
			number: string
			content: string
			isMainStep: boolean
			subSteps: Array<{number: string; content: string; subSubSteps?: Array<{number: string; content: string}>}>
		}>
	>([])
	const [protocolViewMode, setProtocolViewMode] = useState<'segmented' | 'consolidated'>('segmented')
	const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
	const [segmentedViewNoteDismissed, setSegmentedViewNoteDismissed] = useState<boolean>(false)

	const contentRef = useRef<HTMLDivElement>(null)

	// Get experiment ID from props, URL params, localStorage, or other sources
	useEffect(() => {
		setExperimentId(currentExperimentId)
		setMarkdown('')
		setError(null)
		setIsLoading(true)
		setActiveTab('summary')
		// Reset data table to default
		setDataTable({
			id: 'experiment-data-table',
			title: 'Experiment Data',
			headers: ['Parameter', 'Value', 'Units'],
			rows: [
				['Temperature', '', '°C'],
				['Pressure', '', 'bar'],
				['Time', '', 'min']
			]
		})
		// Reset ELN state
		setElnWordUrl('')
		setElnGenerated(false)
		setIsGeneratingEln(false)
		setIsDownloading(false)
	}, [currentExperimentId])

	// Utility function to extract plain text from HTML
	const getPlainText = (html: string): string => {
		const div = document.createElement('div')
		div.innerHTML = html
		return div.textContent || div.innerText || ''
	}

	// Utility function to strip system tags from content for display
	const stripSystemTags = (content: string): string => {
		// Remove all system tags: <summary>, <materials>, <protocol>, <generated_table>
		// But keep <table> tags and their content
		return content
			.replace(/<summary>[\s\S]*?<\/summary>/gi, '')
			.replace(/<materials>[\s\S]*?<\/materials>/gi, '')
			.replace(/<protocol>[\s\S]*?<\/protocol>/gi, '')
			.replace(/<generated_table>[\s\S]*?<\/generated_table>/gi, '')
			.trim()
	}

	// Parse materials content into list items preserving markdown
	const parseMaterialsList = (content: string): string[] => {
		// Split by line breaks
		const lines = content.split(/[\n\r]+/).filter((line) => line.trim())

		// Group consecutive lines that don't start with bullets/numbers as single items
		const items: string[] = []
		let currentItem = ''

		for (const line of lines) {
			const trimmedLine = line.trim()
			// Check if line starts with a list marker
			if (trimmedLine.match(/^[-*•]\s+/) || trimmedLine.match(/^\d+[.):]\s+/)) {
				// Save previous item if exists
				if (currentItem) {
					items.push(currentItem.trim())
				}
				// Start new item, removing the marker
				currentItem = trimmedLine.replace(/^[-*•]\s+/, '').replace(/^\d+[.):]\s+/, '')
			} else {
				// Continue current item
				currentItem += (currentItem ? '\n' : '') + trimmedLine
			}
		}

		// Don't forget the last item
		if (currentItem) {
			items.push(currentItem.trim())
		}

		return items.filter((item) => item.length > 0)
	}

	// Function to convert markdown table inside <table> tags to HTML table
	const processTableTags = (content: string): string => {
		return content.replace(/<table>([\s\S]*?)<\/table>/gi, (match, tableContent) => {
			// Extract the markdown table content
			const lines = tableContent.trim().split(/\r?\n/)
			const tableLines: string[] = []

			// Find markdown table lines (those that start and end with |)
			for (const line of lines) {
				const trimmed = line.trim()
				if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
					tableLines.push(trimmed)
				}
			}

			if (tableLines.length < 2) {
				// Not a valid markdown table, return original
				return match
			}

			// Parse the markdown table
			const headerLine = tableLines[0]
			const separatorLine = tableLines[1]
			const dataLines = tableLines.slice(2)

			// Check if second line is a separator line
			if (!separatorLine.match(/^\|[\s\-:|]+\|$/)) {
				// Not a valid markdown table
				return match
			}

			// Parse headers
			const headers = headerLine
				.split('|')
				.slice(1, -1) // Remove empty first and last elements
				.map((h) => h.trim())

			// Parse data rows
			const rows = dataLines.map((line) =>
				line
					.split('|')
					.slice(1, -1)
					.map((cell) => cell.trim())
			)

			// Build HTML table
			let htmlTable = '<table>\n<thead>\n<tr>\n'
			headers.forEach((header) => {
				htmlTable += `<th>${header}</th>\n`
			})
			htmlTable += '</tr>\n</thead>\n<tbody>\n'

			rows.forEach((row) => {
				htmlTable += '<tr>\n'
				row.forEach((cell) => {
					htmlTable += `<td>${cell}</td>\n`
				})
				htmlTable += '</tr>\n'
			})

			htmlTable += '</tbody>\n</table>'

			return htmlTable
		})
	}

	// Preprocess content to fix markdown table formatting
	const preprocessProtocolContent = (content: string): string => {
		// First process any <table> tags containing markdown tables
		content = processTableTags(content)

		// Split content into lines
		const lines = content.split(/\r?\n/)
		const processedLines: string[] = []
		let inTable = false

		for (let i = 0; i < lines.length; i++) {
			const currentLine = lines[i]
			const nextLine = lines[i + 1]
			const trimmedCurrent = currentLine.trim()

			// Check if we're entering a table
			if (!inTable && trimmedCurrent.startsWith('|') && trimmedCurrent.endsWith('|')) {
				// We're starting a table
				inTable = true

				// Check if previous line needs a blank line
				if (i > 0 && processedLines[processedLines.length - 1].trim() !== '') {
					processedLines.push('') // Add blank line before table
				}
				processedLines.push(currentLine)
			}
			// Check if we're exiting a table
			else if (inTable && (!trimmedCurrent.startsWith('|') || !trimmedCurrent.endsWith('|'))) {
				// Table has ended
				inTable = false

				// Add blank line after table if next content isn't empty
				if (trimmedCurrent !== '') {
					processedLines.push('') // Add blank line after table
				}
				processedLines.push(currentLine)
			}
			// Check if the next line starts a table (for cases where table follows text directly)
			else if (nextLine && nextLine.trim().startsWith('|') && nextLine.trim().endsWith('|') && !trimmedCurrent.startsWith('|') && trimmedCurrent !== '') {
				// Next line is a table and current line is not empty or part of table
				processedLines.push(currentLine)
				processedLines.push('') // Add blank line before table
			} else {
				processedLines.push(currentLine)
			}
		}

		return processedLines.join('\n')
	}

	// Parse protocol steps with hierarchical structure support
	const parseHierarchicalProtocolSteps = (
		content: string
	): Array<{
		number: string
		content: string
		isMainStep: boolean
		subSteps: Array<{number: string; content: string; subSubSteps?: Array<{number: string; content: string}>}>
	}> => {
		const lines = content.split(/[\n\r]+/).filter((line) => line.trim())

		const hierarchicalSteps: Array<{
			number: string
			content: string
			isMainStep: boolean
			subSteps: Array<{number: string; content: string; subSubSteps?: Array<{number: string; content: string}>}>
		}> = []

		let currentMainStep: {
			number: string
			content: string
			isMainStep: boolean
			subSteps: Array<{number: string; content: string; subSubSteps?: Array<{number: string; content: string}>}>
		} | null = null
		let currentSubStep: {number: string; content: string; subSubSteps?: Array<{number: string; content: string}>} | null = null
		let currentSubSubStep: {number: string; content: string} | null = null

		for (const line of lines) {
			const trimmedLine = line.trim()
			if (!trimmedLine) continue

			// Check for three-level sub-step first (most specific: e.g., "1.1.1.", "2.3.2.", "a.", "i.", etc.)
			const subSubStepMatch = trimmedLine.match(/^(\d+\.\d+\.\d+[.):]?|[a-z][.):]?|[ivx]+[.):]?)\s*(.*)/i)
			// Check for two-level sub-step (e.g., "1.1.", "2.3.", etc.)
			const subStepMatch = trimmedLine.match(/^(\d+\.\d+)[.):]?\s*(.*)/)
			// Check for main step (e.g., "1.", "2.", etc.) - only single digits followed by period
			const mainStepMatch = trimmedLine.match(/^(\d+)(?![.]?\d)[.)]\s*(.*)/) // Negative lookahead to exclude "1.1" patterns

			if (subSubStepMatch && currentSubStep) {
				// This is a three-level sub-step (Tier 3)
				if (currentSubSubStep) {
					// Save current sub-sub-step before starting new one
					if (!currentSubStep.subSubSteps) currentSubStep.subSubSteps = []
					currentSubStep.subSubSteps.push(currentSubSubStep)
				}

				currentSubSubStep = {
					number: subSubStepMatch[1].replace(/[.):]+$/, ''),
					content: trimmedLine // Include the full line with numbering
				}
			} else if (subStepMatch && currentMainStep) {
				// This is a two-level sub-step (Tier 2)
				if (currentSubSubStep && currentSubStep) {
					// Save pending sub-sub-step
					if (!currentSubStep.subSubSteps) currentSubStep.subSubSteps = []
					currentSubStep.subSubSteps.push(currentSubSubStep)
					currentSubSubStep = null
				}
				if (currentSubStep) {
					// Save current sub-step before starting new one
					currentMainStep.subSteps.push(currentSubStep)
				}

				currentSubStep = {
					number: subStepMatch[1].replace(/[.):]+$/, ''),
					content: trimmedLine, // Include the full line with numbering
					subSubSteps: []
				}
			} else if (mainStepMatch) {
				// This is a main step (Tier 1) - create main step even if no current context
				if (currentMainStep) {
					// Save any pending sub-step or sub-sub-step
					if (currentSubSubStep && currentSubStep) {
						if (!currentSubStep.subSubSteps) currentSubStep.subSubSteps = []
						currentSubStep.subSubSteps.push(currentSubSubStep)
						currentSubSubStep = null
					}
					if (currentSubStep) {
						currentMainStep.subSteps.push(currentSubStep)
						currentSubStep = null
					}
					// Save current main step
					hierarchicalSteps.push(currentMainStep)
				}

				currentMainStep = {
					number: mainStepMatch[1],
					content: trimmedLine, // Use full line to preserve numbering
					isMainStep: true,
					subSteps: []
				}
				// Reset sub-step context
				currentSubStep = null
				currentSubSubStep = null
			} else {
				// This is continuation content or unmatched step
				if (currentSubSubStep) {
					// Add to current sub-sub-step
					currentSubSubStep.content += (currentSubSubStep.content ? '\n' : '') + trimmedLine
				} else if (currentSubStep) {
					// Add to current sub-step
					currentSubStep.content += (currentSubStep.content ? '\n' : '') + trimmedLine
				} else if (currentMainStep) {
					// Add to current main step
					currentMainStep.content += (currentMainStep.content ? '\n' : '') + trimmedLine
				} else {
					// No step context, create a generic main step
					currentMainStep = {
						number: '1',
						content: trimmedLine,
						isMainStep: true,
						subSteps: []
					}
				}
			}
		}

		// Save final steps
		if (currentMainStep) {
			if (currentSubSubStep && currentSubStep) {
				if (!currentSubStep.subSubSteps) currentSubStep.subSubSteps = []
				currentSubStep.subSubSteps.push(currentSubSubStep)
			}
			if (currentSubStep) {
				currentMainStep.subSteps.push(currentSubStep)
			}
			hierarchicalSteps.push(currentMainStep)
		}

		return hierarchicalSteps
	}

	// Parse protocol steps preserving original numbering and grouping content (legacy)
	const parseProtocolSteps = (content: string): Array<{number: string; content: string}> => {
		// Don't remove markdown, just split by line breaks
		const lines = content.split(/[\n\r]+/).filter((line) => line.trim())

		const steps: Array<{number: string; content: string}> = []
		let currentStep: {number: string; content: string} | null = null

		for (const line of lines) {
			const trimmedLine = line.trim()
			if (!trimmedLine) continue

			// Check if line starts with a number followed by a period or closing parenthesis
			const numberMatch = trimmedLine.match(/^(\d+[.):]?)\s*(.*)/)

			if (numberMatch) {
				// This is a new numbered step
				if (currentStep) {
					steps.push(currentStep)
				}

				currentStep = {
					number: numberMatch[1].replace(/[.):]+$/, ''), // Remove trailing punctuation for display
					content: numberMatch[2] || ''
				}
			} else {
				// This is continuation of the current step
				if (currentStep) {
					currentStep.content += (currentStep.content ? '\n' : '') + trimmedLine
				} else {
					// No numbered step yet, create a generic first step
					currentStep = {
						number: '1',
						content: trimmedLine
					}
				}
			}
		}

		// Don't forget the last step
		if (currentStep) {
			steps.push(currentStep)
		}

		return steps
	}

	// Parse content tags from the protocol
	const parseContentTags = (protocol: string) => {
		const summaryMatch = protocol.match(/<summary>([\s\S]*?)<\/summary>/i)
		const materialsMatch = protocol.match(/<materials>([\s\S]*?)<\/materials>/i)
		const protocolMatch = protocol.match(/<protocol>([\s\S]*?)<\/protocol>/i)
		const tableMatch = protocol.match(/<table>([\s\S]*?)<\/table>/i)
		const generatedTableMatch = protocol.match(/<generated_table>([\s\S]*?)<\/generated_table>/i)

		// Debug logging
		console.log('Parsing protocol tags:', {
			hasGeneratedTable: !!generatedTableMatch,
			generatedTableContent: generatedTableMatch ? generatedTableMatch[1].substring(0, 100) + '...' : null,
			hasTable: !!tableMatch,
			tableContent: tableMatch ? tableMatch[1].substring(0, 100) + '...' : null
		})

		setSummaryContent(summaryMatch ? summaryMatch[1].trim() : 'No summary available')
		setMaterialsContent(materialsMatch ? materialsMatch[1].trim() : 'No materials information available')
		setProtocolContent(protocolMatch ? preprocessProtocolContent(protocolMatch[1].trim()) : 'No protocol steps available')
		// Use generated_table if available, otherwise fall back to table tag
		setTableContent(generatedTableMatch ? generatedTableMatch[1].trim() : tableMatch ? tableMatch[1].trim() : '')

		// Parse materials and protocol into lists
		if (materialsMatch && materialsMatch[1]) {
			setMaterialsList(parseMaterialsList(materialsMatch[1]))
		}
		if (protocolMatch && protocolMatch[1]) {
			// Preprocess content to fix table formatting
			const preprocessedContent = preprocessProtocolContent(protocolMatch[1])

			const legacySteps = parseProtocolSteps(preprocessedContent)
			const hierarchicalStepsData = parseHierarchicalProtocolSteps(preprocessedContent)

			setProtocolSteps(legacySteps)
			setHierarchicalSteps(hierarchicalStepsData)
		}

		// Parse table content if available (prioritize generated_table over table)
		const tableContentToUse = generatedTableMatch ? generatedTableMatch[1] : tableMatch ? tableMatch[1] : null
		if (tableContentToUse) {
			try {
				const tableContent = tableContentToUse.trim()
				let tableParseSuccess = false

				// Try to parse as JSON first
				try {
					const tableData = JSON.parse(tableContent)
					if (tableData.headers && tableData.rows) {
						setDataTable({
							id: 'experiment-data-table',
							title: tableData.title || 'Experiment Data',
							headers: tableData.headers,
							rows: tableData.rows
						})
						setIsGeneratingTable(false)
						tableParseSuccess = true
					}
				} catch (jsonError) {
					// Not JSON, try to parse as Markdown table only if JSON parsing failed
					if (!tableParseSuccess) {
						const lines = tableContent.trim().split('\n')

						// Extract title from markdown header if present
						let title = 'Experiment Data'
						let tableStartIndex = -1

						for (let i = 0; i < lines.length; i++) {
							const line = lines[i].trim()
							// Check for markdown header
							if (line.startsWith('#')) {
								const titleMatch = line.match(/#{1,6}\s+(.+?)$/)
								if (titleMatch) {
									title = titleMatch[1].trim()
								}
							} else if (line && !line.startsWith('#')) {
								// First non-header, non-empty line is likely the table start
								tableStartIndex = i
								break
							}
						}

						if (tableStartIndex >= 0) {
							// Determine delimiter by checking the first data line
							const firstDataLine = lines[tableStartIndex].trim()
							let delimiter = ','

							// Check if line uses pipes or commas
							if (firstDataLine.includes('|') && !firstDataLine.includes(',')) {
								delimiter = '|'
							}

							// Parse headers from the first data line
							const rawHeaders = firstDataLine.split(delimiter).map((h) => h.trim())

							// Find which columns have non-empty headers to maintain alignment
							const validColumnIndices: number[] = []
							const headers: string[] = []
							rawHeaders.forEach((header, index) => {
								if (header) {
									validColumnIndices.push(index)
									headers.push(header)
								}
							})

							// Parse rows (remaining lines)
							const rows: string[][] = []
							for (let i = tableStartIndex + 1; i < lines.length; i++) {
								const line = lines[i].trim()

								// Skip empty lines or separator lines (for pipe tables)
								if (!line || line.match(/^[\-\s|]+$/)) continue

								// Split by delimiter and clean up
								const rawCells = line.split(delimiter).map((cell) => cell.trim())

								// Extract only the cells that correspond to valid column indices
								const cells: string[] = []
								validColumnIndices.forEach((index) => {
									cells.push(rawCells[index] || '')
								})

								// Only add row if it has some content
								if (cells.some((cell) => cell !== '')) {
									rows.push(cells)
								}
							}

							if (headers.length > 0 && rows.length > 0) {
								setDataTable({
									id: 'experiment-data-table',
									title: title,
									headers: headers,
									rows: rows
								})
								setIsGeneratingTable(false)
								tableParseSuccess = true
							}
						}
					}
				}

				// If markdown parsing fails, try HTML table parsing
				if (!tableParseSuccess) {
					const tempDiv = document.createElement('div')
					tempDiv.innerHTML = tableContent
					const tableElement = tempDiv.querySelector('table')

					if (tableElement) {
						// Extract headers
						const headers: string[] = []
						const headerCells = tableElement.querySelectorAll('thead th, thead td')
						if (headerCells.length > 0) {
							headerCells.forEach((cell) => headers.push(cell.textContent?.trim() || ''))
						} else {
							// Try first row as headers
							const firstRow = tableElement.querySelector('tr')
							if (firstRow) {
								firstRow.querySelectorAll('th, td').forEach((cell) => headers.push(cell.textContent?.trim() || ''))
							}
						}

						// Extract rows
						const rows: string[][] = []
						const bodyRows = tableElement.querySelectorAll('tbody tr')
						const allRows = bodyRows.length > 0 ? bodyRows : tableElement.querySelectorAll('tr')

						allRows.forEach((row, index) => {
							// Skip first row if it was used for headers
							if (index === 0 && headers.length > 0 && !tableElement.querySelector('thead')) {
								return
							}

							const rowData: string[] = []
							row.querySelectorAll('td, th').forEach((cell) => rowData.push(cell.textContent?.trim() || ''))

							if (rowData.length > 0) {
								rows.push(rowData)
							}
						})

						if (headers.length > 0 || rows.length > 0) {
							setDataTable({
								id: 'experiment-data-table',
								title: 'Experiment Data',
								headers: headers.length > 0 ? headers : ['Column 1', 'Column 2', 'Column 3'],
								rows: rows.length > 0 ? rows : [['', '', '']]
							})
							setIsGeneratingTable(false)
							tableParseSuccess = true
						}
					}
				}

				// If all parsing fails, use default table
				if (!tableParseSuccess) {
					setDataTable({
						id: 'experiment-data-table',
						title: 'Experiment Data',
						headers: ['Parameter', 'Value', 'Units'],
						rows: [
							['Temperature', '', '°C'],
							['Pressure', '', 'bar'],
							['Time', '', 'min']
						]
					})
					setIsGeneratingTable(false)
				}
			} catch (e) {
				console.error('Error parsing table content:', e)
				// On error, use default table
				setDataTable({
					id: 'experiment-data-table',
					title: 'Experiment Data',
					headers: ['Parameter', 'Value', 'Units'],
					rows: [
						['Temperature', '', '°C'],
						['Pressure', '', 'bar'],
						['Time', '', 'min']
					]
				})
				setIsGeneratingTable(false)
			}
		} else {
			// No table tag found, show default table structure
			setDataTable({
				id: 'experiment-data-table',
				title: 'Experiment Data',
				headers: ['Parameter', 'Value', 'Units'],
				rows: [
					['Temperature', '', '°C'],
					['Pressure', '', 'bar'],
					['Time', '', 'min']
				]
			})
			setIsGeneratingTable(false)
		}
	}

	// Generate data table using the OpenAI service
	const generateDataTable = useCallback(async (title: string, protocol: string) => {
		setIsGeneratingTable(true)

		try {
			const plainText = getPlainText(protocol)
			const response = await performOpenAIAction('generateDataTable', plainText, title)

			if (response.success && response.result) {
				const parsedTable = parseDataTableResponse(response.result)

				if (parsedTable) {
					setDataTable({
						id: 'experiment-data-table',
						title: 'Generated Data Table',
						headers: parsedTable.headers,
						rows: parsedTable.rows
					})
				} else {
					// Fallback to default table if parsing fails
					setDataTable({
						id: 'experiment-data-table',
						title: 'Experiment Data',
						headers: ['Parameter', 'Value', 'Units'],
						rows: [
							['Temperature', '', '°C'],
							['Pressure', '', 'bar'],
							['Time', '', 'min']
						]
					})
				}
			}
		} catch (error) {
			console.error('Error generating data table:', error)
			// Keep default table on error
			setDataTable({
				id: 'experiment-data-table',
				title: 'Experiment Data',
				headers: ['Parameter', 'Value', 'Units'],
				rows: [
					['Temperature', '', '°C'],
					['Pressure', '', 'bar'],
					['Time', '', 'min']
				]
			})
		} finally {
			setIsGeneratingTable(false)
		}
	}, [])

	// Generate ELN content - get Word document and display in viewer
	const generateEln = useCallback(async () => {
		if (!experimentId) return

		setIsGeneratingEln(true)

		try {
			const response = await doGenerateELN({
				experimentId: experimentId,
				send_email: false,
				orgId: currentOrganization?.org_id!
			})
			// Create blob URL for the Word document
			const blob = await response.blob()
			const blobUrl = URL.createObjectURL(blob)
			setElnWordUrl(blobUrl)
			setElnGenerated(true)
		} catch (error: any) {
			console.error('Error generating ELN:', error)
			setElnWordUrl('')
			message.error(`Failed to generate ELN: ${error.message || 'Unknown error'}`)
		} finally {
			setIsGeneratingEln(false)
		}
	}, [experimentId])

	// Download ELN as Word document
	const downloadEln = useCallback(async () => {
		if (!experimentId) return
		setIsDownloading(true)
		try {
			const response = await doGenerateELN({
				experimentId: experimentId,
				send_email: false,
				orgId: currentOrganization?.org_id!
			})

			// Create blob and download
			const blob = await response.blob()
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `experiment_${experimentId}_eln.docx`
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)
		} catch (error) {
			console.error('Error downloading ELN:', error)
		} finally {
			setIsDownloading(false)
		}
	}, [experimentId])

	const fetchExperimentData = useCallback(async () => {
		try {
			const data = await doLoadExperiment({experimentId: experimentId!, orgId: currentOrganization?.org_id!})
			if (data.exists && data.protocol) {
				setMarkdown(data.protocol)
				setError(null)
				setSelectedExperiment(data)
				// Parse content tags from protocol
				parseContentTags(data.protocol)
			} else {
				setMarkdown('No experiment protocol found for this experiment ID.')
				setError(null)
			}
		} catch (e: any) {
			console.error('Error fetching experiment data:', e)
			setError(e.message || 'Could not load experiment data.')
			setMarkdown('')
		} finally {
			setIsLoading(false)
		}
	}, [experimentId, generateDataTable])

	useEffect(() => {
		if (experimentId) {
			fetchExperimentData()
		}
	}, [fetchExperimentData, experimentId])

	// Allow parent components to trigger data refresh
	// useEffect(() => {
	// 	if (onSessionStart) {
	// 		// Store the refresh function for parent components to call
	// 		;(window as any).refreshExperimentData = () => {
	// 			console.log('Refreshing experiment data on session start')
	// 			if (experimentId) {
	// 				fetchExperimentData()
	// 			}
	// 		}
	// 	}

	// 	return () => {
	// 		if ((window as any).refreshExperimentData) {
	// 			delete (window as any).refreshExperimentData
	// 		}
	// 	}
	// }, [experimentId, fetchExperimentData, onSessionStart])

	// Cleanup blob URL when component unmounts or new ELN is generated
	useEffect(() => {
		return () => {
			if (elnWordUrl && elnWordUrl.startsWith('blob:')) {
				URL.revokeObjectURL(elnWordUrl)
			}
		}
	}, [elnWordUrl])

	// Transform image URIs to be relative to the /current_experiment/ public folder
	const transformImageUri = (uri: string) => {
		if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('/')) {
			return uri
		}
		return `/current_experiment/${uri}`
	}

	const handleDataTableChange = (updatedTable: DataTable) => {
		setDataTable(updatedTable)
	}

	const handleDeleteDataTable = (tableId: string) => {
		// Reset to default table structure
		setDataTable({
			id: 'experiment-data-table',
			title: 'Experiment Data',
			headers: ['Parameter', 'Value', 'Units'],
			rows: [
				['Temperature', '', '°C'],
				['Pressure', '', 'bar'],
				['Time', '', 'min']
			]
		})
	}

	if (isLoading) {
		return (
			<Card className="h-full w-full">
				<div className="flex flex-col items-center justify-center h-full">
					<Spin size="large" />
					<Title level={4} className="mt-4 mb-2">
						Loading experiment data...
					</Title>
					{experimentId && (
						<Text type="secondary">
							Experiment ID: <Text code>{experimentId}</Text>
						</Text>
					)}
				</div>
			</Card>
		)
	}

	const tabItems = [
		{
			key: 'summary',
			label: (
				<Space>
					<FileTextOutlined />
					Summary
				</Space>
			),
			children: (
				<div className="h-full w-full">
					<div
						ref={contentRef}
						className="h-full w-full overflow-auto p-4 prose prose-stone prose-sm max-w-none
              prose-ul:space-y-1 prose-ol:space-y-1 prose-li:my-1
              prose-ul:pl-0 prose-ol:pl-0 prose-li:pl-0
              [&_ul>li]:relative [&_ul>li]:pl-6 [&_ul>li]:before:content-['•'] [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:text-primary [&_ul>li]:before:font-bold
              [&_ol>li]:relative [&_ol>li]:pl-6
              [&_input[type='checkbox']]:appearance-none [&_input[type='checkbox']]:w-4 [&_input[type='checkbox']]:h-4 [&_input[type='checkbox']]:border-2 [&_input[type='checkbox']]:border-primary [&_input[type='checkbox']]:rounded-sm [&_input[type='checkbox']]:mr-2 [&_input[type='checkbox']]:relative [&_input[type='checkbox']]:bg-background
              [&_input[type='checkbox']:checked]:bg-primary [&_input[type='checkbox']:checked]:border-primary
              [&_input[type='checkbox']:checked]:after:content-['✓'] [&_input[type='checkbox']:checked]:after:absolute [&_input[type='checkbox']:checked]:after:left-0.5 [&_input[type='checkbox']:checked]:after:top-[-1px] [&_input[type='checkbox']:checked]:after:text-white [&_input[type='checkbox']:checked]:after:text-xs [&_input[type='checkbox']:checked]:after:font-bold
              [&_ul_input[type='checkbox']]:mt-0.5
              [&_li:has(input[type='checkbox'])]:list-none [&_li:has(input[type='checkbox'])]:before:hidden [&_li:has(input[type='checkbox'])]:pl-0">
						{error && <Alert message="Error Loading Experiment" description={error} type="error" icon={<ExclamationCircleOutlined />} className="mb-4" showIcon />}
						<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} urlTransform={transformImageUri}>
							{summaryContent}
						</ReactMarkdown>
					</div>
				</div>
			)
		},
		{
			key: 'materials',
			label: (
				<Space>
					<TableOutlined />
					Materials
				</Space>
			),
			children: (
				<div className="h-full w-full overflow-auto p-6">
					<Title level={4} className="mb-4">
						<ExperimentOutlined /> Required Materials
					</Title>
					{materialsList.length > 0 ? (
						<List
							dataSource={materialsList}
							renderItem={(item, index) => (
								<List.Item
									style={{
										padding: '12px 16px',
										borderBottom: '1px solid var(--border)',
										background: index % 2 === 0 ? 'var(--background)' : 'var(--muted)',
										borderRadius: '4px',
										marginBottom: '4px'
									}}>
									<div className="prose prose-sm max-w-none prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0">
										<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} urlTransform={transformImageUri}>
											{item}
										</ReactMarkdown>
									</div>
								</List.Item>
							)}
							style={{
								background: 'var(--card)',
								borderRadius: '8px',
								padding: '8px'
							}}
						/>
					) : (
						<Empty description="No materials information available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
					)}
				</div>
			)
		},
		{
			key: 'protocol-steps',
			label: (
				<Space>
					<UnorderedListOutlined />
					Protocol Steps
				</Space>
			),
			children: (
				<div className="h-full w-full flex flex-col">
					<style jsx global>{`
						/* HTML and Markdown table styles for protocol steps */
						.protocol-steps-content table {
							border-collapse: collapse;
							width: 100%;
							margin: 1em 0;
							border: 1px solid var(--border);
							font-size: 14px;
						}
						.protocol-steps-content th,
						.protocol-steps-content td {
							border: 1px solid var(--border);
							padding: 8px 12px;
							text-align: left;
							vertical-align: top;
						}
						.protocol-steps-content th {
							background-color: var(--muted);
							font-weight: 600;
							color: var(--foreground);
						}
						.protocol-steps-content tr:nth-child(even) {
							background-color: rgba(0, 0, 0, 0.02);
						}
						.protocol-steps-content tr:hover {
							background-color: rgba(0, 0, 0, 0.04);
						}
						/* Handle tables within ReactMarkdown prose classes */
						.prose table,
						.prose-sm table,
						.prose-xs table {
							border-collapse: collapse !important;
							width: 100% !important;
							margin: 1em 0 !important;
							border: 1px solid var(--border) !important;
							font-size: inherit !important;
						}
						.prose th,
						.prose td,
						.prose-sm th,
						.prose-sm td,
						.prose-xs th,
						.prose-xs td {
							border: 1px solid var(--border) !important;
							padding: 8px 12px !important;
							text-align: left !important;
							vertical-align: top !important;
						}
						.prose th,
						.prose-sm th,
						.prose-xs th {
							background-color: var(--muted) !important;
							font-weight: 600 !important;
							color: var(--foreground) !important;
						}
						.prose tbody tr:nth-child(even),
						.prose-sm tbody tr:nth-child(even),
						.prose-xs tbody tr:nth-child(even) {
							background-color: rgba(0, 0, 0, 0.02) !important;
						}
						.prose tbody tr:hover,
						.prose-sm tbody tr:hover,
						.prose-xs tbody tr:hover {
							background-color: rgba(0, 0, 0, 0.04) !important;
						}
						.protocol-steps-content code {
							background-color: var(--muted);
							padding: 2px 4px;
							border-radius: 3px;
							font-size: 0.9em;
						}
						.protocol-steps-content pre {
							background-color: var(--muted);
							padding: 12px;
							border-radius: 6px;
							overflow-x: auto;
						}
						.protocol-steps-content blockquote {
							border-left: 4px solid var(--primary);
							padding-left: 16px;
							margin-left: 0;
							color: var(--muted-foreground);
						}
						.protocol-steps-content ul,
						.protocol-steps-content ol {
							margin-left: 1.5em;
						}
						.protocol-steps-content hr {
							border: none;
							border-top: 1px solid var(--border);
							margin: 1em 0;
						}
						.protocol-steps-content img {
							max-width: 100%;
							height: auto;
						}
						/* Ensure responsive tables */
						.protocol-steps-content .table-responsive {
							overflow-x: auto;
							margin: 1em 0;
						}
						.protocol-steps-content .table-responsive table {
							margin: 0;
							min-width: 500px;
						}
					`}</style>
					{hierarchicalSteps.length > 0 ? (
						<>
							{/* Main Step Progress Indicator */}
							<Card
								size="small"
								className="shrink-0 rounded-none mb-0"
								style={{
									borderBottom: '1px solid var(--border)'
								}}>
								<Space className="w-full" direction="vertical" size="small">
									<div className="flex justify-between items-center">
										<Title level={4} className="m-0">
											Protocol Steps
										</Title>
										<div className="flex items-center gap-3">
											<Button.Group>
												<Button type={protocolViewMode === 'segmented' ? 'primary' : 'default'} size="small" onClick={() => setProtocolViewMode('segmented')}>
													Segmented
												</Button>
												<Button type={protocolViewMode === 'consolidated' ? 'primary' : 'default'} size="small" onClick={() => setProtocolViewMode('consolidated')}>
													Consolidated
												</Button>
											</Button.Group>
											<Text type="secondary">{`${hierarchicalSteps.length} steps`}</Text>
										</div>
									</div>
								</Space>
							</Card>

							{/* Hierarchical Steps Interface - Following Tier Rules */}
							{protocolViewMode === 'segmented' ? (
								<div className="protocol-steps-content flex-1 overflow-auto">
									{/* Dismissable Note for Segmented View */}
									{!segmentedViewNoteDismissed && <Alert message="About Segmented View" description="Segmented view infers protocol steps to help you toggle through them for ease of reading. If the step formatting and segmentation appears off, tweaking the experiment protocol text for headings and numbering can help. You can modify experiment protocol text by navigating to Create Experiment tab on the main page and then Edit Experiment." type="info" showIcon closable onClose={() => setSegmentedViewNoteDismissed(true)} className="mx-4 mt-4 mb-0 rounded-[6px]" />}
									<div className="p-4">
										{hierarchicalSteps.map((mainStep, mainIndex) => {
											// Determine tier structure
											const hasSubSteps = mainStep.subSteps.length > 0
											const mainStepId = `main-${mainIndex}`
											const isMainStepBold = selectedCells.has(mainStepId)

											// Single tier: Show each step in separate cell
											if (!hasSubSteps) {
												return (
													<Card
														key={mainIndex}
														size="small"
														hoverable
														className="mb-3 cursor-pointer"
														onClick={() => {
															const newSelected = new Set(selectedCells)
															if (newSelected.has(mainStepId)) {
																newSelected.delete(mainStepId)
															} else {
																newSelected.add(mainStepId)
															}
															setSelectedCells(newSelected)
														}}
														style={{
															border: '1px solid var(--border)',
															backgroundColor: 'var(--card)'
														}}
														bodyStyle={{padding: '16px'}}>
														<div className={`${isMainStepBold ? 'font-bold' : 'font-normal'} prose prose-sm max-w-none prose-p:my-1`}>
															<ReactMarkdown
																remarkPlugins={[remarkGfm]}
																rehypePlugins={[rehypeRaw]}
																urlTransform={transformImageUri}
																components={{
																	table: ({node, ...props}) => (
																		<div className="table-responsive">
																			<table {...props} />
																		</div>
																	)
																}}>
																{mainStep.content}
															</ReactMarkdown>
														</div>
													</Card>
												)
											}

											// Two/Three tier: Show numbered step as section and sub-steps/sub-sub-steps in separate cells
											return (
												<div key={mainIndex} className="mb-6">
													{/* Main Step Section Header */}
													<div
														className="px-4 py-3 rounded-lg mb-3 font-bold text-[16px]"
														style={{
															backgroundColor: 'var(--muted)',
															border: '1px solid var(--border)'
														}}>
														{mainStep.content}
													</div>

													{/* Sub-steps as individual clickable cells */}
													<div className="flex flex-col gap-2">
														{mainStep.subSteps.map((subStep, subIndex) => {
															const subStepId = `sub-${mainIndex}-${subIndex}`
															const isSubStepBold = selectedCells.has(subStepId)

															// If sub-step has sub-sub-steps (Three tier), include them in the same cell
															return (
																<Card
																	key={subIndex}
																	size="small"
																	hoverable
																	className="cursor-pointer"
																	onClick={() => {
																		const newSelected = new Set(selectedCells)
																		if (newSelected.has(subStepId)) {
																			newSelected.delete(subStepId)
																		} else {
																			newSelected.add(subStepId)
																		}
																		setSelectedCells(newSelected)
																	}}
																	style={{
																		border: '1px solid var(--border)',
																		backgroundColor: 'var(--card)'
																	}}
																	bodyStyle={{padding: '12px'}}>
																	<div className={`${isSubStepBold ? 'font-bold' : 'font-normal'} prose prose-xs max-w-none prose-p:my-0.5`}>
																		<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} urlTransform={transformImageUri}>
																			{subStep.content}
																		</ReactMarkdown>

																		{/* Include sub-sub-steps in the same cell (Three tier) */}
																		{subStep.subSubSteps && subStep.subSubSteps.length > 0 && (
																			<div className="mt-2 pl-4">
																				{subStep.subSubSteps.map((subSubStep, subSubIndex) => (
																					<div key={subSubIndex} className="mb-1">
																						<ReactMarkdown
																							remarkPlugins={[remarkGfm]}
																							rehypePlugins={[rehypeRaw]}
																							urlTransform={transformImageUri}
																							components={{
																								table: ({node, ...props}) => (
																									<div className="table-responsive">
																										<table {...props} />
																									</div>
																								)
																							}}>
																							{processTableTags(subSubStep.content)}
																						</ReactMarkdown>
																					</div>
																				))}
																			</div>
																		)}
																	</div>
																</Card>
															)
														})}
													</div>
												</div>
											)
										})}
									</div>
								</div>
							) : (
								/* Consolidated View - All steps in a single scrollable list */
								<div className="protocol-steps-content flex-1 overflow-auto p-4">
									<div className="flex flex-col gap-3">
										{hierarchicalSteps.map((mainStep, mainIndex) => (
											<div key={mainIndex}>
												{/* Main Step */}
												<Card
													size="small"
													className="mb-2"
													style={{
														border: '1px solid var(--border)',
														backgroundColor: 'var(--card)'
													}}
													bodyStyle={{padding: '12px'}}>
													<div className="flex items-start gap-3">
														<div
															className="min-w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-[14px] shrink-0"
															style={{
																backgroundColor: 'var(--primary)'
															}}>
															{mainStep.number}
														</div>
														<div
															style={{
																color: 'var(--foreground)'
															}}
															className="flex-1 min-w-0 prose prose-sm max-w-none prose-p:my-1">
															<ReactMarkdown
																remarkPlugins={[remarkGfm]}
																rehypePlugins={[rehypeRaw]}
																urlTransform={transformImageUri}
																components={{
																	table: ({node, ...props}) => (
																		<div className="table-responsive">
																			<table {...props} />
																		</div>
																	)
																}}>
																{processTableTags(mainStep.content)}
															</ReactMarkdown>
														</div>
													</div>
												</Card>

												{/* Sub-steps */}
												{mainStep.subSteps.map((subStep, subIndex) => (
													<Card
														key={subIndex}
														size="small"
														className="mb-2 ml-6"
														style={{
															border: '1px solid var(--border)',
															backgroundColor: 'var(--card)'
														}}
														bodyStyle={{padding: '10px'}}>
														<div className="flex items-start gap-2">
															<div
																className="min-w-[24px] h-[24px] rounded-full flex items-center justify-center font-bold text-[12px] shrink-0"
																style={{
																	backgroundColor: 'var(--secondary)',
																	color: 'var(--secondary-foreground)'
																}}>
																{subStep.number}
															</div>
															<div
																style={{
																	color: 'var(--foreground)'
																}}
																className=" flex-1 min-w-0 prose prose-xs max-w-none prose-p:my-0.5">
																<ReactMarkdown
																	remarkPlugins={[remarkGfm]}
																	rehypePlugins={[rehypeRaw]}
																	urlTransform={transformImageUri}
																	components={{
																		table: ({node, ...props}) => (
																			<div className="table-responsive">
																				<table {...props} />
																			</div>
																		)
																	}}>
																	{subStep.content}
																</ReactMarkdown>

																{/* Sub-sub-steps */}
																{subStep.subSubSteps && subStep.subSubSteps.length > 0 && (
																	<div className="mt-2 pl-4">
																		{subStep.subSubSteps.map((subSubStep, subSubIndex) => (
																			<div key={subSubIndex} className="mb-1 flex items-start gap-1.5">
																				<div
																					className="min-w-[16px] h-[16px] rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5"
																					style={{
																						backgroundColor: 'var(--muted)',
																						color: 'var(--muted-foreground)'
																					}}>
																					{subSubStep.number}
																				</div>
																				<div className="flex-1 text-xs">
																					<ReactMarkdown
																						remarkPlugins={[remarkGfm]}
																						rehypePlugins={[rehypeRaw]}
																						urlTransform={transformImageUri}
																						components={{
																							table: ({node, ...props}) => (
																								<div className="table-responsive">
																									<table {...props} />
																								</div>
																							)
																						}}>
																						{processTableTags(subSubStep.content)}
																					</ReactMarkdown>
																				</div>
																			</div>
																		))}
																	</div>
																)}
															</div>
														</div>
													</Card>
												))}
											</div>
										))}
									</div>
								</div>
							)}
						</>
					) : (
						<div className="h-full flex items-center justify-center p-4">
							<Empty description="No protocol steps available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
						</div>
					)}
				</div>
			)
		},
		{
			key: 'data',
			label: (
				<Space>
					<TableOutlined />
					Data Card
				</Space>
			),
			children: (
				<div className="h-full w-full flex flex-col">
					{/* <Card
						size="small"
						className="shrink-0 rounded-none mb-0"
						style={{
							borderBottom: '1px solid var(--border)'
						}}>
						<Space direction="vertical" size="small">
							<Title level={4} className="m-0">
								Experiment Data Table
							</Title>
							<Text type="secondary">Use this table to record experimental parameters, measurements, and observations.</Text>
						</Space>
					</Card> */}
					<div className="flex-1 overflow-auto p-4 min-h-0">
						{isGeneratingTable ? (
							<div className="flex justify-center items-center h-full">
								<Space direction="vertical" align="center">
									<Spin size="large" />
									<Text type="secondary">Generating data table from experiment details...</Text>
								</Space>
							</div>
						) : (
							<DataTableWrapper table={dataTable} onChange={handleDataTableChange} onDelete={handleDeleteDataTable} onRowComplete={onRowComplete} />
						)}
					</div>
				</div>
			)
		},
		{
			key: 'eln',
			label: (
				<Space>
					<FileWordOutlined />
					Generated ELN
				</Space>
			),
			children: (
				<div className="h-full w-full flex flex-col">
					{/* <Card
						size="small"
						className="shrink-0 rounded-none mb-0"
						style={{
							borderBottom: '1px solid var(--border)'
						}}>
						<Space direction="vertical" size="small">
							<Title level={4} className="m-0">
								Generated Electronic Lab Notebook
							</Title>
							<Text type="secondary">Generate, edit, and download an AI-powered lab notebook for this experiment.</Text>
						</Space>
					</Card> */}
					<div className="flex-1 overflow-auto p-4 min-h-0">
						{!elnGenerated ? (
							<div className="flex flex-col items-center justify-center h-full">
								<Space direction="vertical" align="center" size="large">
									<FileWordOutlined className={`text-[48px] text-[${palette.blue}]`} />
									<Title level={4}>Generate Electronic Lab Notebook</Title>
									<Text type="secondary" className="text-center max-w-[400px]">
										Create a comprehensive lab notebook document containing all experimental details, procedures, data, and analysis generated by AI from your experiment session. <br /> Generating Electronic Lab Notebook may take a few minutes.
									</Text>
									<Button type="primary" size="large" onClick={generateEln} loading={isGeneratingEln} icon={<FileWordOutlined />}>
										{isGeneratingEln ? 'Generating...' : 'Generate ELN Document'}
									</Button>
								</Space>
							</div>
						) : (
							<Card
								title="Generated Electronic Lab Notebook"
								extra={
									<Space>
										<Button loading={isDownloading} type="primary" onClick={downloadEln} icon={<FileWordOutlined />}>
											Download Word Document
										</Button>
										<Button
											onClick={() => {
												setElnGenerated(false)
												setElnWordUrl('')
											}}>
											Generate New
										</Button>
									</Space>
								}
								className="h-full"
								bodyStyle={{height: 'calc(100% - 57px)', padding: 0}}>
								{elnWordUrl ? (
									<DocumentViewer
										wordBlobUrl={elnWordUrl}
										onLoadError={(error) => {
											console.error('DocumentViewer error:', error)
											message.error('Failed to load document content')
										}}
									/>
								) : (
									<div
										className="flex-1 flex items-center justify-center p-[48px] italic"
										style={{
											color: 'var(--muted-foreground)'
										}}>
										ELN content will appear here...
									</div>
								)}
							</Card>
						)}
					</div>
				</div>
			)
		}
	]

	return (
		<div className="h-full w-full flex flex-col">
			<Tabs
				activeKey={activeTab}
				onChange={setActiveTab}
				items={tabItems}
				tabBarStyle={{
					marginBottom: 0,
					paddingLeft: '16px',
					paddingRight: '16px',
					borderBottom: '1px solid var(--border)',
					flexShrink: 0
					// width: '100%'
				}}
				style={{
					height: '100%',
					width: '100%',
					display: 'flex',
					flexDirection: 'column'
				}}
				className="experiment-tabs"
			/>
		</div>
	)
}
