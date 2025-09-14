import React, {useState} from 'react'
import {Card, Button, Space, Spin, Empty, message} from 'antd'
import {CopyOutlined, CheckOutlined} from '@ant-design/icons'

interface ResultsSectionProps {
	title: string
	content: string
	loading: boolean
	onRunCheck: () => void
	buttonText: string
	buttonIcon?: React.ReactNode
	emptyStateText: string
}

const ResultsSection: React.FC<ResultsSectionProps> = ({title, content, loading, onRunCheck, buttonText, buttonIcon, emptyStateText}) => {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		try {
			const textToCopy = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
			await navigator.clipboard.writeText(textToCopy)
			setCopied(true)
			message.success('Results copied to clipboard')
			setTimeout(() => setCopied(false), 2000)
		} catch (err) {
			console.error('Failed to copy text: ', err)
			message.error('Failed to copy text')
		}
	}

	const formatContent = (text: string) => {
		return text.split('\n').map((line, index) => {
			// Handle empty lines for better spacing
			if (!line.trim()) {
				return <div key={index} style={{height: 12}}></div>
			}

			// Apply special styling for section headers with emojis
			if (line.match(/^[💪⚠️🚨✨💡🎯📋🏁🔸📝📊🔬🧪📄🔄]/)) {
				return (
					<div key={index} className="section-header-line">
						{line}
					</div>
				)
			}

			return (
				<div key={index} className="content-line">
					{line}
				</div>
			)
		})
	}

	const extra = (
		<Space>
			<Button type="primary" icon={buttonIcon} loading={loading} onClick={onRunCheck}>
				{buttonText}
			</Button>
			{content && (
				<Button icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={handleCopy} type={copied ? 'primary' : 'default'}>
					{copied ? 'Copied' : 'Copy Results'}
				</Button>
			)}
		</Space>
	)

	return (
		<Card title={title} extra={extra}>
			<div className="min-h-[200px]">
				{loading ? (
					<div className="text-center py-[60px] px-0">
						<Spin size="large" />
						<div className="mt-[16px] text-charcol-gray">Processing your document...</div>
					</div>
				) : content ? (
					<div className="leading-[1.6]">{typeof content === 'string' ? formatContent(content) : <pre className="bg-white-shade-gray p-4 rounded-[6px] overflow-auto">{JSON.stringify(content, null, 2)}</pre>}</div>
				) : (
					<Empty description={emptyStateText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
				)}
			</div>
		</Card>
	)
}

export default ResultsSection
