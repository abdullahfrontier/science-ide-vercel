import React, {useState, useCallback, useEffect} from 'react'
import {Button} from '@/components/button/Button'
import {LoadingSVG} from '@/components/button/LoadingSVG'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {ChevronIcon} from '@/components/playground/icons'
import {useRouter} from 'next/router'
import {doGetSessionSummary} from '@/api'

interface ScientificUpdate {
	timestamp: string
	update: string
	session_id?: number
}

interface SessionInfo {
	session_id: number
	session_uuid: string
	start_time: string
	end_time: string
}

interface SessionSummary {
	session_id?: number
	experiment_id: number
	experiment_title: string
	session_start?: string
	session_end?: string
	summary_date?: string
	total_sessions?: number
	day_start?: string
	day_end?: string
	sessions_included?: SessionInfo[]
	scientific_updates: ScientificUpdate[]
}

interface SessionLogsPaneProps {
	experimentId: string | null
	currentSessionId?: string | null
}

export const SessionLogsPane = ({experimentId, currentSessionId}: SessionLogsPaneProps) => {
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [summary, setSummary] = useState<SessionSummary | null>(null)
	const [selectedScope, setSelectedScope] = useState<'session' | 'day'>('day')
	const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
	const [copySuccess, setCopySuccess] = useState(false)

	const fetchSessionSummary = useCallback(async () => {
		if (!experimentId) {
			setError('No experiment ID available')
			return
		}

		if (selectedScope === 'session' && !currentSessionId) {
			setError('No session ID available for session scope')
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const params = new URLSearchParams({
				scope: selectedScope
			})

			if (selectedScope === 'session' && currentSessionId) {
				params.append('sessionId', currentSessionId)
			}

			if (selectedScope === 'day') {
				params.append('date', selectedDate)
			}

			console.log('Fetching session summary with:', {
				experimentId,
				sessionId: currentSessionId,
				scope: selectedScope,
				date: selectedScope === 'day' ? selectedDate : undefined
			})

			const data = await doGetSessionSummary({experimentId: experimentId, params: params})
			setSummary(data)
		} catch (e: any) {
			console.error('Error fetching session summary:', e)
			// Extract more detailed error information
			if (e.details) {
				setError(`${e.message}: ${e.details}`)
			} else {
				setError(e.message || 'Failed to fetch session summary')
			}
			setSummary(null)
		} finally {
			setIsLoading(false)
		}
	}, [experimentId, currentSessionId, selectedScope, selectedDate])

	useEffect(() => {
		setSummary(null)
		setError(null)
	}, [experimentId])

	// Remove auto-loading - users must click the refresh button to load logs
	const formatTimestamp = (timestamp: string) => {
		const date = new Date(timestamp)
		return date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		})
	}

	const formatDate = (timestamp: string) => {
		const date = new Date(timestamp)
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}

	const handleCopyLogs = useCallback(async () => {
		if (!summary || !summary.scientific_updates.length) {
			return
		}

		try {
			let copyText = ''

			// Add header information
			if (selectedScope === 'day' && summary.sessions_included) {
				copyText += `Session Summary - ${formatDate(summary.summary_date || '')}\n`
				copyText += `${summary.total_sessions} session${summary.total_sessions !== 1 ? 's' : ''}\n`
				copyText += `${formatTimestamp(summary.day_start || '')} - ${formatTimestamp(summary.day_end || '')}\n\n`
			} else {
				copyText += `Session Summary - ${summary.experiment_title || 'Unknown Experiment'}\n`
				if (summary.session_start && summary.session_end) {
					copyText += `${formatTimestamp(summary.session_start)} - ${formatTimestamp(summary.session_end)}\n`
				}
				copyText += '\n'
			}

			// Add scientific updates
			copyText += 'Scientific Updates:\n'
			copyText += '===================\n\n'

			summary.scientific_updates.forEach((update, index) => {
				copyText += `${formatTimestamp(update.timestamp)} - ${update.update}`
				if (selectedScope === 'day' && update.session_id) {
					copyText += ` (Session #${update.session_id})`
				}
				copyText += '\n\n'
			})

			await navigator.clipboard.writeText(copyText)
			setCopySuccess(true)
			setTimeout(() => setCopySuccess(false), 2000)
		} catch (error) {
			console.error('Failed to copy to clipboard:', error)
		}
	}, [summary, selectedScope])

	if (!experimentId) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
				<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">📋</div>
				<p className="text-sm text-center">No experiment selected</p>
			</div>
		)
	}

	if (!currentSessionId && selectedScope === 'session') {
		return (
			<div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
				<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">🔬</div>
				<p className="text-sm text-center">No active session</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col h-full min-h-0">
			<div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
				<h3 className="text-sm font-medium text-foreground">Session Logs</h3>

				<div className="flex items-center gap-2">
					{selectedScope === 'day' && <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-2 py-1 text-xs rounded-md border border-border bg-background text-foreground" max={new Date().toISOString().split('T')[0]} />}

					<DropdownMenu.Root modal={false}>
						<DropdownMenu.Trigger className="group inline-flex items-center gap-1 rounded-md hover:bg-accent hover:text-accent-foreground bg-background border border-border px-2 py-1 text-foreground text-xs transition-colors font-medium">
							<span>Full Day</span>
							<ChevronIcon />
						</DropdownMenu.Trigger>

						<DropdownMenu.Portal>
							<DropdownMenu.Content className="z-50 flex flex-col gap-0 overflow-hidden rounded-md text-foreground border border-border bg-popover shadow-lg py-1 text-xs" sideOffset={5} align="end">
								<DropdownMenu.Item onSelect={() => setSelectedScope('day')} className="flex items-center gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer focus:outline-none focus:bg-accent focus:text-accent-foreground transition-colors">
									<div className={`w-2 h-2 rounded-full ${selectedScope === 'day' ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
									<span>Full Day Summary</span>
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Portal>
					</DropdownMenu.Root>

					<Button variant="outline" onClick={fetchSessionSummary} disabled={isLoading} size="sm" className="text-xs px-3 py-1" title="Load session logs">
						{isLoading ? <LoadingSVG diameter={12} /> : <span className="flex items-center gap-1">🔄 Load</span>}
					</Button>

					<Button variant="outline" onClick={handleCopyLogs} disabled={!summary || !summary.scientific_updates.length} size="sm" className="text-xs px-2 py-1">
						{copySuccess ? '✅' : '📋'}
					</Button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto bg-card rounded-md border border-border p-3 min-h-0" style={{minHeight: '100px'}}>
				{isLoading ? (
					<div className="flex flex-col items-center justify-center h-full min-h-[8rem] text-muted-foreground">
						<LoadingSVG diameter={24} />
						<p className="text-xs mt-2">Loading session logs...</p>
					</div>
				) : error ? (
					<div className="text-red-600 p-3 border border-red-200 bg-red-50 rounded-md min-h-[8rem] flex items-center">
						<p className="text-xs">{error}</p>
					</div>
				) : summary ? (
					<div className="space-y-3">
						{selectedScope === 'day' && summary.sessions_included && (
							<div className="border-b border-border pb-2 mb-3">
								<p className="text-xs text-muted-foreground mb-1">
									{summary.total_sessions} session{summary.total_sessions !== 1 ? 's' : ''} on {formatDate(summary.summary_date || '')}
								</p>
								<p className="text-xs text-muted-foreground">
									{formatTimestamp(summary.day_start || '')} - {formatTimestamp(summary.day_end || '')}
								</p>
							</div>
						)}

						{summary.scientific_updates.length === 0 ? (
							<div className="text-center text-muted-foreground py-8 min-h-[8rem] flex items-center justify-center">
								<p className="text-xs">No scientific updates recorded</p>
							</div>
						) : (
							<div className="space-y-2">
								{summary.scientific_updates.map((update, index) => (
									<div key={index} className="border-l-2 border-primary/30 pl-3 py-1">
										<div className="flex items-start gap-2">
											<span className="text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(update.timestamp)}</span>
											<p className="text-xs text-foreground flex-1">{update.update}</p>
										</div>
										{selectedScope === 'day' && update.session_id && <p className="text-xs text-muted-foreground mt-0.5">Session #{update.session_id}</p>}
									</div>
								))}
							</div>
						)}
					</div>
				) : (
					<div className="text-center text-muted-foreground py-8 min-h-[8rem] flex flex-col items-center justify-center gap-2">
						<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">🔄</div>
						<p className="text-xs">Click the refresh button to load session logs</p>
					</div>
				)}
			</div>
		</div>
	)
}
