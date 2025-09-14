import React, {useState} from 'react'
import {Card, Button, Space, Table, Spin, Empty, message, Input} from 'antd'
import {ExperimentOutlined, CopyOutlined, CheckOutlined} from '@ant-design/icons'
import type {ColumnsType} from 'antd/es/table'
import {ReproducibilityRow} from '../../utils/formatters'
import {palette} from '@/styles/color'

interface ReproducibilityTableProps {
	data: ReproducibilityRow[]
	loading: boolean
	onRunCheck: () => void
	onDataChange?: (data: ReproducibilityRow[]) => void
	onCopy?: () => void
}

const ReproducibilityTable: React.FC<ReproducibilityTableProps> = ({data, loading, onRunCheck, onDataChange, onCopy}) => {
	const [copied, setCopied] = useState(false)

	const handleUserInputChange = (id: string, value: string) => {
		if (onDataChange) {
			const updatedData = data.map((row) => (row.id === id ? {...row, userInput: value} : row))
			onDataChange(updatedData)
		}
	}

	const handleCopy = async () => {
		if (!data.length) return

		try {
			// Create a formatted text version of the table including user inputs
			const headers = ['Step', 'Issue', 'Why It Matters', 'Your Notes']
			const tableText = [headers.join('\t'), ...data.map((row) => [row.step, row.issue, row.whyItMatters, row.userInput || '[No notes entered]'].join('\t'))].join('\n')

			await navigator.clipboard.writeText(tableText)
			setCopied(true)
			message.success('Reproducibility risk table copied to clipboard')
			setTimeout(() => setCopied(false), 2000)

			if (onCopy) onCopy()
		} catch (err) {
			console.error('Failed to copy table: ', err)
			message.error('Failed to copy table')
		}
	}

	const columns: ColumnsType<ReproducibilityRow> = [
		{
			title: '🔬 Step',
			dataIndex: 'step',
			key: 'step',
			width: '20%',
			render: (text: string) => <span className={`font-semibold text-[${palette.blue}]`}>{text}</span>
		},
		{
			title: '❌ Issue',
			dataIndex: 'issue',
			key: 'issue',
			width: '25%',
			render: (text: string) => <span className="text-warm-toned-red">{text}</span>
		},
		{
			title: '❓ Why It Matters',
			dataIndex: 'whyItMatters',
			key: 'whyItMatters',
			width: '30%',
			render: (text: string) => <span className="text-charcol-gray">{text}</span>
		},
		{
			title: '📝 Your Notes',
			key: 'userInput',
			width: '25%',
			render: (_: any, record: ReproducibilityRow) => <Input.TextArea value={record.userInput || ''} onChange={(e) => handleUserInputChange(record.id, e.target.value)} placeholder="Enter issue details or notes..." autoSize={{minRows: 1, maxRows: 3}} style={{border: 'none', boxShadow: 'none', backgroundColor: 'transparent'}} />
		}
	]

	const dataSource = data.map((row) => ({
		...row,
		key: row.id
	}))

	const extra = (
		<Space>
			<Button type="primary" icon={<ExperimentOutlined />} loading={loading} onClick={onRunCheck}>
				Check Reproducibility Risk
			</Button>
			{data.length > 0 && (
				<Button icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={handleCopy} type={copied ? 'primary' : 'default'}>
					{copied ? 'Copied' : 'Copy Table'}
				</Button>
			)}
		</Space>
	)

	return (
		<Card title="🔬 Reproducibility Risk Assessment" extra={extra} className="data-table-container">
			<div className="min-h-[300px]">
				{loading ? (
					<div className="text-center py-100 px-0">
						<Spin size="large" />
						<div className="mt-4 text-charcol-gray">Analyzing your document for reproducibility risks...</div>
					</div>
				) : data.length > 0 ? (
					<div>
						<div className="mb-4 p-3 bg-ice-blue rounded-[6px] border border-airy-cyan-blue">
							<strong>Instructions:</strong> {`Review the identified issues and add your notes or the actual values in the "Your Notes" column.`}
						</div>
						<Table columns={columns} dataSource={dataSource} pagination={false} scroll={{x: 800}} size="middle" />
					</div>
				) : (
					<Empty description="Click 'Check Reproducibility Risk' to analyze your document for issues that could affect reproducibility" image={Empty.PRESENTED_IMAGE_SIMPLE} />
				)}
			</div>
		</Card>
	)
}

export default ReproducibilityTable
