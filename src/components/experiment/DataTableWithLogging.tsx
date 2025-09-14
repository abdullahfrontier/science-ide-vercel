import React, {useState, useEffect, useRef} from 'react'
import {Card, Input, Button, Table, Space, Popconfirm, message, Tooltip} from 'antd'
import {PlusOutlined, MinusCircleOutlined, DeleteOutlined, CheckCircleOutlined} from '@ant-design/icons'
import type {ColumnsType} from 'antd/es/table'
import {DataTable} from '../../services/documentService'

interface DataTableWithLoggingProps {
	table: DataTable
	onChange: (table: DataTable) => void
	onDelete: (tableId: string) => void
	onLog?: (csvRows: string[]) => void
}

export const DataTableWithLogging: React.FC<DataTableWithLoggingProps> = ({table, onChange, onDelete, onLog}) => {
	const [hasChangedSinceLog, setHasChangedSinceLog] = useState<boolean>(false)
	const [lastLoggedState, setLastLoggedState] = useState<string>('')
	const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({})
	const tableRef = useRef<HTMLDivElement>(null)
	const [isResizing, setIsResizing] = useState<{columnKey: string | null; startX: number; startWidth: number}>({columnKey: null, startX: 0, startWidth: 0})

	// Create a state signature for the table data
	const getTableStateSignature = (tableData: DataTable): string => {
		return JSON.stringify({
			title: tableData.title,
			headers: tableData.headers,
			rows: tableData.rows
		})
	}

	useEffect(() => {
		const initialSignature = getTableStateSignature(table)
		setLastLoggedState(initialSignature)
		setHasChangedSinceLog(false)
		// Initialize column widths
		const initialWidths: {[key: string]: number} = {}
		table.headers.forEach((_, index) => {
			initialWidths[`col_${index}`] = 200
		})
		setColumnWidths(initialWidths)
	}, []) // Only run once when component mounts

	const checkForChanges = (newTable: DataTable) => {
		const currentSignature = getTableStateSignature(newTable)
		if (currentSignature !== lastLoggedState) {
			setHasChangedSinceLog(true)
		}
	}

	const updateTitle = (title: string) => {
		const newTable = {...table, title}
		onChange(newTable)
		checkForChanges(newTable)
	}

	const updateHeader = (index: number, value: string) => {
		const newHeaders = [...table.headers]
		newHeaders[index] = value
		const newTable = {...table, headers: newHeaders}
		onChange(newTable)
		checkForChanges(newTable)
	}

	const updateCell = (rowIndex: number, colIndex: number, value: string) => {
		const newRows = [...table.rows]
		newRows[rowIndex] = [...newRows[rowIndex]]
		newRows[rowIndex][colIndex] = value
		const newTable = {...table, rows: newRows}
		onChange(newTable)
		checkForChanges(newTable)
	}

	const addColumn = () => {
		const newHeaders = [...table.headers, `Column ${table.headers.length + 1}`]
		const newRows = table.rows.map((row) => [...row, ''])
		const newTable = {...table, headers: newHeaders, rows: newRows}
		onChange(newTable)
		checkForChanges(newTable)
	}

	const removeColumn = (colIndex: number) => {
		if (table.headers.length <= 1) return
		const newHeaders = table.headers.filter((_, index) => index !== colIndex)
		const newRows = table.rows.map((row) => row.filter((_, index) => index !== colIndex))
		const newTable = {...table, headers: newHeaders, rows: newRows}
		onChange(newTable)
		checkForChanges(newTable)
	}

	const addRow = () => {
		const newRow = new Array(table.headers.length).fill('')
		const newTable = {...table, rows: [...table.rows, newRow]}
		onChange(newTable)
		checkForChanges(newTable)
	}

	const removeRow = (rowIndex: number) => {
		if (table.rows.length <= 1) return
		const newRows = table.rows.filter((_, index) => index !== rowIndex)
		const newTable = {...table, rows: newRows}
		onChange(newTable)
		checkForChanges(newTable)
	}

	const logTable = () => {
		const csvRows: string[] = []

		// Add header row first
		const headerRow = table.headers
			.map((header) => {
				if (header.includes(',') || header.includes('"') || header.includes('\n')) {
					return `"${header.replace(/"/g, '""')}"`
				}
				return header
			})
			.join(',')
		csvRows.push(headerRow)

		// Compare against last logged state
		const prevTable: DataTable = lastLoggedState ? JSON.parse(lastLoggedState) : {title: '', headers: [], rows: []}

		let changedRowCount = 0
		table.rows.forEach((row, rowIndex) => {
			const prevRow = prevTable.rows?.[rowIndex]

			// A row is considered changed if it doesn’t exist before
			// OR if the full row string doesn’t match the previous row string
			const rowChanged = !prevRow || row.join('|') !== prevRow.join('|')

			if (rowChanged) {
				const csvRow = row
					.map((cell) => {
						if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
							return `"${cell.replace(/"/g, '""')}"`
						}
						return cell
					})
					.join(',')
				csvRows.push(csvRow)
				changedRowCount++
			}
		})

		if (changedRowCount === 0) {
			message.warning('No changed rows to log.')
			return
		}

		if (onLog) {
			onLog(csvRows)
			console.log(csvRows.join('\n'))
			const currentSignature = JSON.stringify(table)
			setLastLoggedState(currentSignature)
			setHasChangedSinceLog(false)
			message.success(`Logged ${changedRowCount} updated row(s)`)
		}
	}

	const columns: ColumnsType<any> = [
		...table.headers.map((header, colIndex) => {
			const columnKey = `col_${colIndex}`
			return {
				title: (
					<div className="flex items-center justify-between">
						<Tooltip title={header} placement="topLeft">
							<Input value={header} onChange={(e) => updateHeader(colIndex, e.target.value)} placeholder="Header" bordered={false} className="font-semibold flex-1" />
						</Tooltip>
						{table.headers.length > 1 && (
							<Popconfirm title="Delete this column?" onConfirm={() => removeColumn(colIndex)} okText="Yes" cancelText="No">
								<Button className="text-warm-toned-red" type="text" size="small" icon={<MinusCircleOutlined />} />
							</Popconfirm>
						)}
						{colIndex < table.headers.length - 1 && (
							<div
								className="column-resize-handle absolute -right-[3px] top-0 bottom-0 w-[6px] cursor-col-resize bg-transparent z-[1]"
								onMouseDown={(e) => {
									e.preventDefault()
									setIsResizing({
										columnKey,
										startX: e.clientX,
										startWidth: columnWidths[columnKey] || 200
									})
								}}
							/>
						)}
					</div>
				),
				dataIndex: columnKey,
				key: columnKey,
				width: columnWidths[columnKey] || 200,
				ellipsis: {
					showTitle: false
				},
				render: (value: string, record: any, rowIndex: number) => {
					const cellValue = table.rows[rowIndex][colIndex] || ''
					return (
						<Tooltip title={cellValue} placement="topLeft" mouseEnterDelay={0.5}>
							<Input className="w-full" value={cellValue} onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)} placeholder="Enter value" bordered={false} />
						</Tooltip>
					)
				}
			}
		}),
		...(table.rows.length > 1
			? [
					{
						title: '',
						key: 'actions',
						width: 50,
						render: (_: any, record: any, rowIndex: number) => (
							<Popconfirm title="Delete this row?" onConfirm={() => removeRow(rowIndex)} okText="Yes" cancelText="No">
								<Button type="text" size="small" icon={<MinusCircleOutlined />} className="text-warm-toned-red" />
							</Popconfirm>
						)
					}
				]
			: [])
	]

	const dataSource = table.rows.map((row, index) => {
		const record: any = {key: index}
		row.forEach((cell, colIndex) => {
			record[`col_${colIndex}`] = cell
		})
		return record
	})

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isResizing.columnKey) {
				const deltaX = e.clientX - isResizing.startX
				const newWidth = Math.max(100, isResizing.startWidth + deltaX)
				setColumnWidths((prev) => ({
					...prev,
					[isResizing.columnKey!]: newWidth
				}))
			}
		}
		const handleMouseUp = () => {
			setIsResizing({columnKey: null, startX: 0, startWidth: 0})
		}
		if (isResizing.columnKey) {
			document.addEventListener('mousemove', handleMouseMove)
			document.addEventListener('mouseup', handleMouseUp)
			document.body.style.cursor = 'col-resize'
			document.body.style.userSelect = 'none'
		}
		return () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
			document.body.style.cursor = ''
			document.body.style.userSelect = ''
		}
	}, [isResizing])

	return (
		<Card
			title={
				<div className="flex items-center justify-between">
					<Input value={table.title} onChange={(e) => updateTitle(e.target.value)} placeholder="Table Title" bordered={false} className="text-base font-semibold max-w-[60%]" />
					<Space>
						<Button type="primary" onClick={logTable} icon={<CheckCircleOutlined />} disabled={!hasChangedSinceLog}>
							Log Table
						</Button>
						<Popconfirm title="Delete this table?" onConfirm={() => onDelete(table.id)} okText="Yes" cancelText="No">
							<Button type="text" icon={<DeleteOutlined />} danger />
						</Popconfirm>
					</Space>
				</div>
			}
			size="small"
			className="mb-4">
			<div ref={tableRef} className="overflow-x-auto">
				<style jsx>{`
					:global(.ant-table-thead > tr > th) {
						position: relative;
						background-clip: padding-box;
					}
					:global(.column-resize-handle:hover) {
						background-color: var(--primary) !important;
					}
					:global(.ant-table-cell) {
						overflow: hidden;
						text-overflow: ellipsis;
						white-space: nowrap;
					}
					:global(.ant-input) {
						text-overflow: ellipsis;
					}
					:global(.ant-table) {
						user-select: ${isResizing.columnKey ? 'none' : 'auto'};
					}
				`}</style>
				<Table columns={columns} dataSource={dataSource} pagination={false} scroll={{x: 'max-content'}} size="small" bordered tableLayout="fixed" />
			</div>
			<div className="mt-3 flex gap-2">
				<Button icon={<PlusOutlined />} onClick={addRow} size="small">
					Add Row
				</Button>
				<Button icon={<PlusOutlined />} onClick={addColumn} size="small">
					Add Column
				</Button>
			</div>
		</Card>
	)
}
