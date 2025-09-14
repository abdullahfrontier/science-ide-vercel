import React, {useState, useEffect, useRef, useCallback} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {useConfig} from '@/hooks/useConfig'
import {LoadingSVG} from '../button/LoadingSVG'
import {Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun} from 'docx'
import {saveAs} from 'file-saver'
import {useRouter} from 'next/router'
import {palette} from '@/styles/color'

import {useSelector} from 'react-redux'
import {RootState} from '@/store'
import {doLoadExperiment} from '@/api'

export const ExperimentPane = () => {
	const {currentOrganization, currentExperimentId} = useSelector((state: RootState) => state.auth)
	const [markdown, setMarkdown] = useState<string>('')
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)
	const [experimentId, setExperimentId] = useState<string | null>(null)
	const contentRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		setExperimentId(currentExperimentId)
	}, [currentExperimentId])

	const fetchExperimentData = useCallback(async () => {
		setIsLoading(true)
		try {
			const data = await doLoadExperiment({experimentId: experimentId!, orgId: currentOrganization?.org_id!})
			if (data.exists && data.protocol) {
				setMarkdown(data.protocol)
				setError(null)
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
	}, [experimentId])

	useEffect(() => {
		if (experimentId) {
			fetchExperimentData()
		}
	}, [fetchExperimentData, experimentId])

	// Transform image URIs to be relative to the /current_experiment/ public folder
	const transformImageUri = (uri: string) => {
		if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('/')) {
			return uri
		}
		return `/current_experiment/${uri}`
	}

	const handleDownloadPdf = async () => {
		if (!contentRef.current) return

		try {
			// Create a temporary div for PDF generation with white background and black text
			const tempDiv = document.createElement('div')
			tempDiv.style.position = 'absolute'
			tempDiv.style.left = '-9999px'
			tempDiv.style.backgroundColor = 'white'
			tempDiv.style.color = 'black'
			tempDiv.style.padding = '20px'
			tempDiv.style.width = '800px' // Fixed width for PDF
			tempDiv.className = 'prose max-w-none' // Apply prose styling without invert

			// Clone the content
			tempDiv.innerHTML = contentRef.current.innerHTML

			// Fix image paths in the cloned content
			const images = tempDiv.querySelectorAll('img')
			images.forEach((img) => {
				const src = img.getAttribute('src')
				if (src && !src.startsWith('http') && !src.startsWith('/')) {
					img.setAttribute('src', `/current_experiment/${src}`)
				}
				// Make sure images have width/height
				img.style.maxWidth = '100%'
			})

			// Fix styling for PDF
			const allElements = tempDiv.querySelectorAll('*')
			allElements.forEach((el) => {
				if (el instanceof HTMLElement) {
					// Override any dark mode styles
					el.style.color = 'black'
					el.style.backgroundColor = 'transparent'

					// Fix links
					if (el.tagName === 'A') {
						el.style.color = `${palette.pure_blue}`
						el.style.textDecoration = 'underline'
					}

					// Fix code blocks
					if (el.tagName === 'PRE' || el.tagName === 'CODE') {
						el.style.backgroundColor = `${palette.white_shade_gray}`
						el.style.padding = el.tagName === 'PRE' ? '10px' : '2px 4px'
						el.style.borderRadius = '4px'
						el.style.fontFamily = 'monospace'
					}
				}
			})

			// Add to document temporarily
			document.body.appendChild(tempDiv)

			// Wait for images to load
			await new Promise((resolve) => setTimeout(resolve, 500))

			// Capture the entire content as a single canvas
			const canvas = await html2canvas(tempDiv, {
				useCORS: true,
				scale: 1.5,
				logging: true,
				backgroundColor: 'white',
				width: tempDiv.offsetWidth,
				height: tempDiv.offsetHeight
			})

			// Create PDF with dimensions matching the content
			const imgWidth = 550 // Width in points
			const imgHeight = (canvas.height * imgWidth) / canvas.width

			const pdf = new jsPDF({
				orientation: 'portrait',
				unit: 'pt',
				format: [imgWidth + 40, imgHeight + 40] // Add margins
			})

			// Add the image to the PDF
			pdf.addImage(
				canvas,
				'PNG',
				20,
				20, // Position with margins
				imgWidth,
				imgHeight // Dimensions
			)

			// Remove the temporary element
			document.body.removeChild(tempDiv)

			// Save the PDF
			pdf.save('experiment_report.pdf')
		} catch (e) {
			console.error('Error generating PDF:', e)
			alert('Failed to generate PDF. See console for details.')
		}
	}

	const handleDownloadWord = async () => {
		if (!contentRef.current) return

		try {
			const paragraphs: Paragraph[] = []

			paragraphs.push(
				new Paragraph({
					text: 'Experiment Report',
					heading: HeadingLevel.TITLE,
					spacing: {after: 300}
				})
			)

			const markdownLines = markdown.split('\n')

			for (let i = 0; i < markdownLines.length; i++) {
				const rawLine = markdownLines[i] // Keep raw line for code blocks
				const line = rawLine.trim()

				if (!line) continue

				if (line.startsWith('#')) {
					const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
					if (headingMatch) {
						const level = headingMatch[1].length
						const text = headingMatch[2].trim()

						paragraphs.push(
							new Paragraph({
								text: text,
								heading: HeadingLevel[`HEADING_${Math.min(level, 6)}` as keyof typeof HeadingLevel], // Type assertion for safety
								spacing: {before: 240, after: 120}
							})
						)
					}
				} else if (line.startsWith('```')) {
					let codeContent = ''
					i++
					while (i < markdownLines.length && !markdownLines[i].trim().startsWith('```')) {
						codeContent += markdownLines[i] + '\n' // Preserve original line endings and spacing for code
						i++
					}
					// Remove trailing newline if any, but keep internal newlines
					codeContent = codeContent.replace(/\n$/, '')

					paragraphs.push(
						new Paragraph({
							children: [
								new TextRun({
									text: codeContent, // Use potentially multi-line content
									font: 'Courier New',
									size: 20
								})
							],
							spacing: {before: 120, after: 120},
							border: {
								top: {color: 'auto', space: 1, style: 'single', size: 6},
								bottom: {color: 'auto', space: 1, style: 'single', size: 6},
								left: {color: 'auto', space: 1, style: 'single', size: 6},
								right: {color: 'auto', space: 1, style: 'single', size: 6}
							},
							shading: {type: 'clear', fill: 'F5F5F5'}
						})
					)
				} else if (line.startsWith('!')) {
					const imageMatch = line.match(/!\[(.*?)\]\((.*?)\)/)
					if (imageMatch) {
						const altText = imageMatch[1].trim()
						let imagePath = imageMatch[2].trim()

						try {
							if (!imagePath.startsWith('http') && !imagePath.startsWith('/')) {
								imagePath = `/current_experiment/${imagePath}`
							}
							if (imagePath.startsWith('/')) {
								imagePath = window.location.origin + imagePath
							}

							const response = await fetch(imagePath)
							if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
							const blob = await response.blob()
							const arrayBuffer = await blob.arrayBuffer()

							let displayWidth = 400 // Default width
							let displayHeight = 300 // Default height

							// Try to get natural dimensions to maintain aspect ratio
							const tempImage = new Image()
							const imageLoadPromise = new Promise<void>((resolve, reject) => {
								tempImage.onload = () => resolve()
								tempImage.onerror = (err) => reject(err)
								tempImage.src = URL.createObjectURL(blob)
							})

							try {
								await imageLoadPromise
								const naturalWidth = tempImage.naturalWidth
								const naturalHeight = tempImage.naturalHeight

								const maxWidthInPoints = 500 // Max width for the image in the document

								if (naturalWidth > maxWidthInPoints) {
									displayWidth = maxWidthInPoints
									displayHeight = Math.round(naturalHeight * (maxWidthInPoints / naturalWidth))
								} else {
									displayWidth = naturalWidth
									displayHeight = naturalHeight
								}
							} catch (dimensionError) {
								console.error('Error getting image dimensions, using defaults:', dimensionError)
								// Defaults are already set
							} finally {
								if (tempImage.src.startsWith('blob:')) {
									URL.revokeObjectURL(tempImage.src) // Clean up blob URL
								}
							}

							paragraphs.push(
								new Paragraph({
									children: [
										new ImageRun({
											data: arrayBuffer,
											type: 'png',
											transformation: {
												width: displayWidth,
												height: displayHeight
											}
										})
									],
									spacing: {before: 200, after: 200}
								})
							)

							if (altText) {
								paragraphs.push(
									new Paragraph({
										children: [
											new TextRun({
												text: altText,
												italics: true,
												size: 18 // Smaller size for caption
											})
										],
										alignment: 'center',
										spacing: {after: 240}
									})
								)
							}
						} catch (imgError) {
							console.error('Error processing image:', imgError)
							paragraphs.push(
								new Paragraph({
									children: [new TextRun(`[Image: ${altText || imagePath} - Error: ${imgError instanceof Error ? imgError.message : String(imgError)}]`)],
									spacing: {before: 120, after: 120}
								})
							)
						}
					}
				}
				// Handle regular paragraphs (must be last)
				else {
					paragraphs.push(
						new Paragraph({
							children: [new TextRun(line)], // Use the trimmed line
							spacing: {after: 200}
						})
					)
				}
			}

			// Create the document with our paragraphs
			const doc = new Document({
				sections: [
					{
						properties: {},
						children: paragraphs
					}
				]
			})

			// Generate and save the document
			const buffer = await Packer.toBuffer(doc)
			saveAs(
				new Blob([buffer as unknown as ArrayBuffer], {
					type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
				}),
				'experiment_report.docx'
			)
		} catch (e) {
			console.error('Error generating Word document:', e)
			alert('Failed to generate Word document. See console for details.')
		}
	}

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
				<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
					<LoadingSVG diameter={30} />
				</div>
				<h3 className="text-lg font-medium text-foreground mb-2">Loading experiment data...</h3>
				{experimentId && (
					<p className="text-sm text-muted-foreground">
						Experiment ID: <span className="font-mono text-primary">{experimentId}</span>
					</p>
				)}
			</div>
		)
	}

	return (
		<div className="flex flex-col h-full w-full">
			{/* Main content area with protocol - now takes full height */}
			<div className="flex-grow overflow-hidden">
				{/* Experiment Protocol Pane */}
				<div
					ref={contentRef}
					className="h-full overflow-y-auto p-6 bg-card rounded-lg border border-border prose prose-stone prose-sm max-w-none
          prose-ul:space-y-1 prose-ol:space-y-1 prose-li:my-1
          prose-ul:pl-0 prose-ol:pl-0 prose-li:pl-0
          [&_ul>li]:relative [&_ul>li]:pl-6 [&_ul>li]:before:content-['•'] [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:text-primary [&_ul>li]:before:font-bold
          [&_ol>li]:relative [&_ol>li]:pl-6
          [&_input[type='checkbox']]:appearance-none [&_input[type='checkbox']]:w-4 [&_input[type='checkbox']]:h-4 [&_input[type='checkbox']]:border-2 [&_input[type='checkbox']]:border-primary [&_input[type='checkbox']]:rounded-sm [&_input[type='checkbox']]:mr-2 [&_input[type='checkbox']]:relative [&_input[type='checkbox']]:bg-background
          [&_input[type='checkbox']:checked]:bg-primary [&_input[type='checkbox']:checked]:border-primary
          [&_input[type='checkbox']:checked]:after:content-['✓'] [&_input[type='checkbox']:checked]:after:absolute [&_input[type='checkbox']:checked]:after:left-0.5 [&_input[type='checkbox']:checked]:after:top-[-1px] [&_input[type='checkbox']:checked]:after:text-white [&_input[type='checkbox']:checked]:after:text-xs [&_input[type='checkbox']:checked]:after:font-bold
          [&_ul_input[type='checkbox']]:mt-0.5
          [&_li:has(input[type='checkbox'])]:list-none [&_li:has(input[type='checkbox'])]:before:hidden [&_li:has(input[type='checkbox'])]:pl-0">
					{error && (
						<div className="text-red-800 p-4 border border-red-200 bg-red-50 rounded-lg mb-4 flex items-start gap-3">
							<span className="text-lg">🚨</span>
							<div>
								<h4 className="font-medium mb-1">Error Loading Experiment</h4>
								<p className="text-sm">{error}</p>
							</div>
						</div>
					)}
					<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} urlTransform={transformImageUri}>
						{markdown}
					</ReactMarkdown>
				</div>
			</div>
			{/* PDF and Word buttons hidden for now */}
			{/* <div className="mt-4 flex gap-3">
        <Button
          variant="outline"
          onClick={handleDownloadPdf}
          className="flex-1"
          size="sm"
        >
          📄 PDF
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadWord}
          className="flex-1"
          size="sm"
        >
          📝 Word
        </Button>
      </div> */}
		</div>
	)
}
