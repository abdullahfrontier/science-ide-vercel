import React, {useState, useEffect} from 'react'
import dynamic from 'next/dynamic'
import {Spin, Space} from 'antd'
import {DataTable} from '../../services/documentService'

const DataTableWithLogging = dynamic(() => import('./DataTableWithLogging').then((mod) => ({default: mod.DataTableWithLogging})), {
	ssr: false,
	loading: () => (
		<div className="flex justify-center items-center p-8">
			<Space>
				<Spin size="large" />
				<span>Loading data table...</span>
			</Space>
		</div>
	)
})

interface DataTableWrapperProps {
	table: DataTable
	onChange: (table: DataTable) => void
	onDelete: (tableId: string) => void
	onRowComplete?: (csvRow: string) => void
}

export const DataTableWrapper: React.FC<DataTableWrapperProps> = ({table, onChange, onDelete, onRowComplete}) => {
	const [isClient, setIsClient] = useState(false)

	useEffect(() => {
		setIsClient(true)
	}, [])

	if (!isClient) {
		return (
			<div className="flex justify-center items-center p-8">
				<Space>
					<Spin size="large" />
					<span>Loading data table...</span>
				</Space>
			</div>
		)
	}

	// Handle logging of rows
	const handleLog = (csvRows: string[]) => {
		if (onRowComplete) {
			// Send all CSV rows as a single message
			const fullCsvData = csvRows.join('\n')
			onRowComplete(fullCsvData)
		}
	}

	return <DataTableWithLogging table={table} onChange={onChange} onDelete={onDelete} onLog={handleLog} />
}
