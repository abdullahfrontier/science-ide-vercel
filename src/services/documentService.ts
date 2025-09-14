import {Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell} from 'docx'
import {saveAs} from 'file-saver'
import {ReproducibilityRow} from '../utils/formatters'

export interface DataTable {
	id: string
	title: string
	rows: string[][]
	headers: string[]
}

export interface DocumentExportData {
	title: string
	originalText: string
	critiqueResults?: string
	reproducibilityResults?: string
	reproducibilityData?: ReproducibilityRow[]
	powerAnalysisResults?: any
	dataTables?: DataTable[]
}

// Helper function to create paragraphs with Eureka: tags styled differently
function createStyledParagraph(text: string): Paragraph {
	const parts = text.split(/(Eureka:\[.*?\])/g)
	const children: TextRun[] = []

	parts.forEach((part) => {
		if (part.startsWith('Eureka:')) {
			// Style Eureka additions with different color
			children.push(
				new TextRun({
					text: part,
					color: 'CC6600', // Orange color for Eureka additions
					bold: true
				})
			)
		} else if (part.trim()) {
			// Regular text
			children.push(new TextRun(part))
		}
	})

	return new Paragraph({
		children: children.length > 0 ? children : [new TextRun(text)],
		spacing: {after: 100}
	})
}

export async function exportToWord(data: DocumentExportData): Promise<void> {
	try {
		// Create enhanced original text with filled-in missing details
		let enhancedText = data.originalText
		let detailsAddedNote = ''

		// If we have reproducibility data with user input, enhance the original text
		if (data.reproducibilityData && data.reproducibilityData.length > 0) {
			const filledDetails = data.reproducibilityData
				.filter((row) => row.userInput && row.userInput.trim())
				.map((row) => ({
					step: row.step,
					issue: row.issue,
					userInput: row.userInput
				}))

			if (filledDetails.length > 0) {
				// Try to intelligently insert the missing details into the text
				filledDetails.forEach((detail) => {
					// Look for the step in the text and try to add the missing detail
					const stepRegex = new RegExp(detail.step, 'gi')
					if (stepRegex.test(enhancedText)) {
						// Find sentences containing the step
						const sentences = enhancedText.split(/[.!?]+/)
						const updatedSentences = sentences.map((sentence) => {
							if (stepRegex.test(sentence)) {
								// Add the missing detail to the sentence with Eureka tag
								return sentence + ` Eureka:[Added: ${detail.issue} = ${detail.userInput}]`
							}
							return sentence
						})
						enhancedText = updatedSentences.join('. ').replace(/\. +\./g, '.')
					}
				})

				// Add a summary note about filled details with Eureka tag
				detailsAddedNote = '\n\nEureka:[Issues Addressed:]\n'
				filledDetails.forEach((detail) => {
					detailsAddedNote += `Eureka:• ${detail.step}: ${detail.issue} = ${detail.userInput}\n`
				})
			}
		}

		const doc = new Document({
			sections: [
				{
					properties: {},
					children: [
						// Title
						new Paragraph({
							text: data.title,
							heading: HeadingLevel.TITLE,
							spacing: {after: 400}
						}),

						// Enhanced Original Text Section with filled details
						new Paragraph({
							text: 'Original Document (with addressed issues)',
							heading: HeadingLevel.HEADING_1,
							spacing: {before: 400, after: 200}
						}),
						...enhancedText.split('\n').map((line) => createStyledParagraph(line)),
						...(detailsAddedNote ? detailsAddedNote.split('\n').map((line) => createStyledParagraph(line)) : []),

						// Data Tables Section
						...(data.dataTables && data.dataTables.length > 0
							? [
									new Paragraph({
										text: 'Data Tables',
										heading: HeadingLevel.HEADING_1,
										spacing: {before: 400, after: 200}
									}),
									...data.dataTables.flatMap((table) => [
										new Paragraph({
											text: table.title,
											heading: HeadingLevel.HEADING_2,
											spacing: {before: 200, after: 100}
										}),
										new Table({
											rows: [
												// Header row
												new TableRow({
													children: table.headers.map(
														(header) =>
															new TableCell({
																children: [
																	new Paragraph({
																		children: [new TextRun({text: header, bold: true})]
																	})
																]
															})
													)
												}),
												// Data rows
												...table.rows.map(
													(row) =>
														new TableRow({
															children: row.map(
																(cell) =>
																	new TableCell({
																		children: [
																			new Paragraph({
																				children: [new TextRun(cell)]
																			})
																		]
																	})
															)
														})
												)
											]
										}),
										new Paragraph({text: '', spacing: {after: 200}}) // Spacing after table
									])
								]
							: []),

						// Critique Results Section
						...(data.critiqueResults
							? [
									new Paragraph({
										text: 'Design Critique',
										heading: HeadingLevel.HEADING_1,
										spacing: {before: 400, after: 200}
									}),
									...data.critiqueResults.split('\n').map((line) => createStyledParagraph(line))
								]
							: []),

						// Reproducibility Risk Assessment Section
						...(data.reproducibilityData && data.reproducibilityData.length > 0
							? [
									new Paragraph({
										text: 'Reproducibility Risk Assessment',
										heading: HeadingLevel.HEADING_1,
										spacing: {before: 400, after: 200}
									}),
									new Table({
										rows: [
											// Header row
											new TableRow({
												children: [
													new TableCell({
														children: [
															new Paragraph({
																children: [new TextRun({text: 'Step', bold: true})]
															})
														]
													}),
													new TableCell({
														children: [
															new Paragraph({
																children: [new TextRun({text: 'Issue', bold: true})]
															})
														]
													}),
													new TableCell({
														children: [
															new Paragraph({
																children: [new TextRun({text: 'Why It Matters', bold: true})]
															})
														]
													}),
													new TableCell({
														children: [
															new Paragraph({
																children: [new TextRun({text: 'Your Notes/Values', bold: true})]
															})
														]
													})
												]
											}),
											// Data rows
											...data.reproducibilityData.map(
												(row) =>
													new TableRow({
														children: [
															new TableCell({
																children: [
																	new Paragraph({
																		children: [new TextRun(row.step)]
																	})
																]
															}),
															new TableCell({
																children: [
																	new Paragraph({
																		children: [new TextRun(row.issue)]
																	})
																]
															}),
															new TableCell({
																children: [
																	new Paragraph({
																		children: [new TextRun(row.whyItMatters)]
																	})
																]
															}),
															new TableCell({
																children: [
																	new Paragraph({
																		children: [
																			new TextRun({
																				text: row.userInput || '[No notes entered]',
																				bold: row.userInput ? true : false,
																				color: row.userInput ? '0066CC' : '999999'
																			})
																		]
																	})
																]
															})
														]
													})
											)
										]
									})
								]
							: []),

						// Legacy text-based reproducibility results (fallback)
						...(data.reproducibilityResults && (!data.reproducibilityData || data.reproducibilityData.length === 0)
							? [
									new Paragraph({
										text: 'Reproducibility Risk Assessment',
										heading: HeadingLevel.HEADING_1,
										spacing: {before: 400, after: 200}
									}),
									...data.reproducibilityResults.split('\n').map((line) => createStyledParagraph(line))
								]
							: []),

						// Power Analysis & Sample Size Section
						...(data.powerAnalysisResults
							? [
									new Paragraph({
										text: 'Sample Size & Power Analysis',
										heading: HeadingLevel.HEADING_1,
										spacing: {before: 400, after: 200}
									}),
									new Paragraph({
										children: [
											new TextRun({
												text: `Eureka:[Recommended Sample Size: ${data.powerAnalysisResults.sampleSize} participants]`,
												color: 'CC6600',
												bold: true
											})
										],
										spacing: {after: 200}
									}),
									new Paragraph({
										children: [
											new TextRun({
												text: `Analysis Type: ${data.powerAnalysisResults.analysisType}`,
												bold: true
											})
										],
										spacing: {after: 100}
									}),
									new Paragraph({
										children: [new TextRun(`Statistical Power: ${(data.powerAnalysisResults.power * 100).toFixed(1)}%`)],
										spacing: {after: 100}
									}),
									new Paragraph({
										children: [new TextRun(`Effect Size: ${data.powerAnalysisResults.effectSize.toFixed(3)} (${data.powerAnalysisResults.effectSize < 0.2 ? 'Very Small' : data.powerAnalysisResults.effectSize < 0.5 ? 'Small' : data.powerAnalysisResults.effectSize < 0.8 ? 'Medium' : 'Large'})`)],
										spacing: {after: 100}
									}),
									new Paragraph({
										children: [new TextRun(`Significance Level (α): ${data.powerAnalysisResults.parameters.alpha}`)],
										spacing: {after: 100}
									}),
									...(data.powerAnalysisResults.parameters.samplePerGroup
										? [
												new Paragraph({
													children: [new TextRun(`Sample per Group: ${data.powerAnalysisResults.parameters.samplePerGroup}`)],
													spacing: {after: 100}
												})
											]
										: []),
									new Paragraph({
										children: [
											new TextRun({
												text: `Eureka:[Recommendation: Consider adding 10-20% more participants to account for dropouts and missing data (${Math.ceil(data.powerAnalysisResults.sampleSize * 1.15)}-${Math.ceil(data.powerAnalysisResults.sampleSize * 1.2)} total participants)]`,
												color: 'CC6600',
												bold: true
											})
										],
										spacing: {after: 200}
									})
								]
							: [])
					]
				}
			]
		})

		const blob = await Packer.toBlob(doc)
		const fileName = `${data.title.replace(/[^a-zA-Z0-9]/g, '_')}_design_check.docx`
		saveAs(blob, fileName)
	} catch (error) {
		console.error('Error exporting to Word:', error)
		throw new Error('Failed to export document')
	}
}

export function generateEmptyDataTable(): DataTable {
	return {
		id: Date.now().toString(),
		title: 'New Data Table',
		headers: ['Column 1', 'Column 2', 'Column 3'],
		rows: [
			['', '', ''],
			['', '', ''],
			['', '', '']
		]
	}
}
