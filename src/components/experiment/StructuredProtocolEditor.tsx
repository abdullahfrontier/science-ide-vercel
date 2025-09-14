import React, {useState, useEffect} from 'react'
import {Card, Input, Typography, Alert, Space, Divider} from 'antd'
import {InfoCircleOutlined, EditOutlined} from '@ant-design/icons'

const {TextArea} = Input
const {Title, Text} = Typography

interface StructuredProtocolEditorProps {
	value?: string
	onChange?: (value: string) => void
	placeholder?: string
	disabled?: boolean
}

interface ProtocolSection {
	tag: string
	content: string
	displayName: string
	description: string
	placeholder: string
}

export const StructuredProtocolEditor: React.FC<StructuredProtocolEditorProps> = ({value = '', onChange, placeholder, disabled = false}) => {
	const [sections, setSections] = useState<ProtocolSection[]>([])

	// Parse the protocol text into structured sections
	const parseProtocolSections = (text: string): ProtocolSection[] => {
		const defaultSections: ProtocolSection[] = [
			{
				tag: 'summary',
				content: '',
				displayName: 'Experiment Summary',
				description: 'High-level overview of the experiment objectives and approach',
				placeholder: 'Provide a clear summary of what this experiment aims to achieve...'
			},
			{
				tag: 'materials',
				content: '',
				displayName: 'Materials & Equipment',
				description: 'List of all materials, reagents, and equipment needed',
				placeholder: 'List the materials needed:\n- Item 1\n- Item 2\n- Equipment A'
			},
			{
				tag: 'protocol',
				content: '',
				displayName: 'Protocol Steps',
				description: 'Step-by-step experimental procedures',
				placeholder: 'Detailed step-by-step protocol:\n1. First step\n2. Second step\n3. Third step'
			}
		]

		if (!text.trim()) {
			return defaultSections
		}

		// Extract content from existing tags
		const updatedSections = defaultSections.map((section) => {
			const regex = new RegExp(`<${section.tag}>(.*?)</${section.tag}>`, 'is')
			const match = text.match(regex)

			return {
				...section,
				content: match ? match[1].trim() : ''
			}
		})

		return updatedSections
	}

	// Reconstruct the full protocol text from sections
	const reconstructProtocol = (sections: ProtocolSection[]): string => {
		return sections
			.filter((section) => section.content.trim()) // Only include sections with content
			.map((section) => `<${section.tag}>\n${section.content.trim()}\n</${section.tag}>`)
			.join('\n\n')
	}

	// Initialize sections from value
	useEffect(() => {
		setSections(parseProtocolSections(value))
	}, [value])

	// Handle section content changes
	const handleSectionChange = (index: number, newContent: string) => {
		const updatedSections = [...sections]
		updatedSections[index].content = newContent
		setSections(updatedSections)

		// Notify parent of changes
		if (onChange) {
			onChange(reconstructProtocol(updatedSections))
		}
	}

	return (
		<div style={{width: '100%'}}>
			{/* Information Alert */}
			<Alert message="Structured Protocol Editor" description="Edit the content within each section. The section tags will be automatically maintained." type="info" showIcon icon={<InfoCircleOutlined />} style={{marginBottom: '16px'}} />

			{/* Section Editors */}
			<Space direction="vertical" size="large" style={{width: '100%'}}>
				{sections.map((section, index) => (
					<Card
						key={section.tag}
						size="small"
						title={
							<Space>
								<EditOutlined />
								{section.displayName}
								<Text type="secondary" style={{fontSize: '12px', fontWeight: 'normal'}}>
									&lt;{section.tag}&gt; ... &lt;/{section.tag}&gt;
								</Text>
							</Space>
						}
						style={{
							border: '1px solid var(--border)',
							backgroundColor: 'var(--card)'
						}}>
						<Space direction="vertical" size="small" style={{width: '100%'}}>
							<Text type="secondary" style={{fontSize: '13px'}}>
								{section.description}
							</Text>

							<TextArea
								value={section.content}
								onChange={(e) => handleSectionChange(index, e.target.value)}
								placeholder={section.placeholder}
								disabled={disabled}
								rows={section.tag === 'protocol' ? 8 : 4}
								style={{
									fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
									fontSize: '13px'
								}}
							/>

							{section.content.trim() && (
								<div
									style={{
										padding: '8px 12px',
										backgroundColor: 'var(--muted)',
										borderRadius: '6px',
										fontSize: '12px',
										color: 'var(--muted-foreground)'
									}}>
									<Text type="secondary">Character count: {section.content.length}</Text>
								</div>
							)}
						</Space>
					</Card>
				))}
			</Space>

			{/* Raw View Toggle for Advanced Users */}
			<Divider />
			<Card
				size="small"
				title="Raw Protocol Text (Read-only)"
				style={{
					backgroundColor: 'var(--muted)',
					border: '1px solid var(--border)'
				}}>
				<pre
					style={{
						fontSize: '11px',
						color: 'var(--muted-foreground)',
						margin: 0,
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word'
					}}>
					{reconstructProtocol(sections) || 'No content yet...'}
				</pre>
			</Card>
		</div>
	)
}
