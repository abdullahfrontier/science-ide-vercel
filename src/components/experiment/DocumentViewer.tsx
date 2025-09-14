import React, {useState, useEffect} from 'react'
import {Spin, Alert} from 'antd'
import mammoth from 'mammoth'
import {palette} from '@/styles/color'

interface DocumentViewerProps {
	wordBlobUrl: string
	onLoadError?: (error: any) => void
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({wordBlobUrl, onLoadError}) => {
	const [htmlContent, setHtmlContent] = useState<string>('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string>('')

	useEffect(() => {
		const convertToHtml = async () => {
			if (!wordBlobUrl) return

			setLoading(true)
			setError('')

			try {
				// Fetch the blob data
				const response = await fetch(wordBlobUrl)
				const arrayBuffer = await response.arrayBuffer()

				// Convert to HTML using mammoth
				const result = await mammoth.convertToHtml({
					arrayBuffer: arrayBuffer
				})

				// Add custom styles to the HTML
				const styledHtml = `
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #1a1a1a;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
            h1 { font-size: 2em; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.3em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.2em; }
            p { margin: 1em 0; }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
            }
            table, th, td {
              border: 1px solid #ddd;
            }
            th, td {
              padding: 8px 12px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            ul, ol {
              margin: 1em 0;
              padding-left: 2em;
            }
            li {
              margin: 0.5em 0;
            }
            img {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 1em auto;
            }
            blockquote {
              border-left: 4px solid #e0e0e0;
              padding-left: 1em;
              margin: 1em 0;
              color: #666;
            }
            code {
              background-color: #f5f5f5;
              padding: 2px 4px;
              border-radius: 3px;
              font-family: monospace;
            }
            pre {
              background-color: #f5f5f5;
              padding: 1em;
              border-radius: 4px;
              overflow-x: auto;
            }
            pre code {
              background-color: transparent;
              padding: 0;
            }
          </style>
          ${result.value}
        `

				setHtmlContent(styledHtml)

				// Log any warnings from mammoth
				if (result.messages.length > 0) {
					console.warn('Document conversion warnings:', result.messages)
				}
			} catch (err) {
				console.error('Error converting document:', err)
				setError('Failed to load document content')
				if (onLoadError) {
					onLoadError(err)
				}
			} finally {
				setLoading(false)
			}
		}

		convertToHtml()
	}, [wordBlobUrl, onLoadError])

	if (loading) {
		return (
			<div className="flex justify-center items-center h-full min-h-[400px] w-full">
				<Spin size="large" tip="Loading document..." />
			</div>
		)
	}

	if (error) {
		return (
			<div className="p-5">
				<Alert message="Document Load Error" description={error} type="error" showIcon />
			</div>
		)
	}

	return (
		<div className="h-full w-full overflow-auto bg-white border border-light-gray rounded-lg">
			<iframe srcDoc={htmlContent} className="w-full h-full border-0 min-h-[600px]" title="ELN Document Viewer" sandbox="allow-same-origin allow-scripts" />
		</div>
	)
}
