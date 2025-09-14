import React from 'react'
import {Card, Input, Button, Table, Space, Popconfirm} from 'antd'
import {PlusOutlined, MinusCircleOutlined, DeleteOutlined} from '@ant-design/icons'
import type {ColumnsType} from 'antd/es/table'
import {DataTable} from '../../services/documentService'

interface DataTableEditorProps {
	table: DataTable
	onChange: (table: DataTable) => void
	onDelete: (tableId: string) => void
	onRowComplete?: (csvRow: string) => void
}

const DataTableEditor: React.FC<DataTableEditorProps> = ({table, onChange, onDelete, onRowComplete}) => {
	const updateTitle = (title: string) => {
		onChange({...table, title})
	}

	const updateHeader = (index: number, value: string) => {
		const newHeaders = [...table.headers]
		newHeaders[index] = value
		onChange({...table, headers: newHeaders})
	}

	const updateCell = (rowIndex: number, colIndex: number, value: string) => {
		const newRows = [...table.rows]
		newRows[rowIndex] = [...newRows[rowIndex]]
		newRows[rowIndex][colIndex] = value
		onChange({...table, rows: newRows})

		// Check if the row is now complete (all cells have values)
		const updatedRow = newRows[rowIndex]
		const isRowComplete = updatedRow.every((cell) => cell.trim() !== '')

		if (isRowComplete && onRowComplete) {
			// Convert row to CSV format
			const csvRow = updatedRow
				.map((cell) => {
					// Escape cells containing commas or quotes
					if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
						return `"${cell.replace(/"/g, '""')}"`
					}
					return cell
				})
				.join(',')

			onRowComplete(csvRow)
		}
	}

	const addColumn = () => {
		const newHeaders = [...table.headers, `Column ${table.headers.length + 1}`]
		const newRows = table.rows.map((row) => [...row, ''])
		onChange({...table, headers: newHeaders, rows: newRows})
	}

	const removeColumn = (colIndex: number) => {
		if (table.headers.length <= 1) return
		const newHeaders = table.headers.filter((_, index) => index !== colIndex)
		const newRows = table.rows.map((row) => row.filter((_, index) => index !== colIndex))
		onChange({...table, headers: newHeaders, rows: newRows})
	}

	const addRow = () => {
		const newRow = new Array(table.headers.length).fill('')
		onChange({...table, rows: [...table.rows, newRow]})
	}

	const removeRow = (rowIndex: number) => {
		if (table.rows.length <= 1) return
		const newRows = table.rows.filter((_, index) => index !== rowIndex)
		onChange({...table, rows: newRows})
	}

	// Create columns for the Ant Design table
	const columns: ColumnsType<any> = [
		...table.headers.map((header, colIndex) => ({
			title: (
				<div className="flex items-center justify-between">
					<Input value={header} onChange={(e) => updateHeader(colIndex, e.target.value)} placeholder="Header" bordered={false} className="font-semibold" />
					{table.headers.length > 1 && (
						<Popconfirm title="Delete this column?" onConfirm={() => removeColumn(colIndex)} okText="Yes" cancelText="No">
							<Button className="text-warm-toned-red" type="text" size="small" icon={<MinusCircleOutlined />} />
						</Popconfirm>
					)}
				</div>
			),
			dataIndex: `col_${colIndex}`,
			key: `col_${colIndex}`,
			render: (value: string, record: any, rowIndex: number) => <Input value={table.rows[rowIndex][colIndex] || ''} onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)} placeholder="Enter value" bordered={false} />
		}))
	]

	// Add action column for row deletion if there are multiple rows
	if (table.rows.length > 1) {
		columns.push({
			title: '',
			key: 'action',
			width: 50,
			render: (_, record, rowIndex) => (
				<Popconfirm title="Delete this row?" onConfirm={() => removeRow(rowIndex)} okText="Yes" cancelText="No">
					<Button type="text" size="small" icon={<MinusCircleOutlined />} className="text-warm-toned-red" />
				</Popconfirm>
			)
		})
	}

	// Create data source for the table
	const dataSource = table.rows.map((row, index) => ({
		key: index,
		...row.reduce((acc, cell, colIndex) => {
			acc[`col_${colIndex}`] = cell
			return acc
		}, {} as any)
	}))

	const extra = (
		<Popconfirm title="Delete this table?" description="This action cannot be undone." onConfirm={() => onDelete(table.id)} okText="Yes" cancelText="No">
			<Button type="primary" danger icon={<DeleteOutlined />}>
				Delete Table
			</Button>
		</Popconfirm>
	)

	return (
		<Card className="mb-4" extra={extra} title={<Input value={table.title} onChange={(e) => updateTitle(e.target.value)} placeholder="Table Title" bordered={false} className="text-[16px] font-semibold" />}>
			<Space direction="vertical" size="middle" className="w-full">
				<Space>
					<Button type="dashed" icon={<PlusOutlined />} onClick={addColumn}>
						Add Column
					</Button>
					<Button type="dashed" icon={<PlusOutlined />} onClick={addRow}>
						Add Row
					</Button>
				</Space>

				<Table className="bg-neutral-gray" columns={columns} dataSource={dataSource} pagination={false} scroll={{x: 'max-content'}} size="small" bordered />
			</Space>
		</Card>
	)
}

export default DataTableEditor
