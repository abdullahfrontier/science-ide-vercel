import React, {useState, useEffect, useCallback} from 'react'
import {LoadingSVG} from '../button/LoadingSVG'
import {useRouter} from 'next/router'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {ChevronIcon} from '../playground/icons'

import {useDispatch, useSelector} from 'react-redux'
import {RootState, AppDispatch} from '@/store'
import {updatecurrentExperimentId} from '@/store/slices/authSlice'
import {doGetExperiments} from '@/api'

interface Experiment {
	id: number
	name: string
	description?: string
	experiment_id?: string
	title?: string
	protocol?: string
	user_name?: string
}

interface ExperimentPickerProps {
	onExperimentChange?: (experimentId: string) => void
	compact?: boolean
}

export const ExperimentPicker: React.FC<ExperimentPickerProps> = ({onExperimentChange, compact = false}) => {
	const {currentOrganization, currentExperimentId} = useSelector((state: RootState) => state.auth)
	const [experimentId, setExperimentId] = useState<string | null>(null)
	const [experiments, setExperiments] = useState<Experiment[]>([])
	const [experimentsLoading, setExperimentsLoading] = useState<boolean>(true)
	const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
	const [experimentChanging, setExperimentChanging] = useState<boolean>(false)
	const dispatch = useDispatch<AppDispatch>()

	const fetchExperiments = useCallback(async () => {
		try {
			const data = await doGetExperiments({orgId: currentOrganization?.org_id!})
			const transformedExperiments = (data.experiments || []).map((exp: any) => ({
				id: exp.experiment_id || exp.id,
				name: exp.title,
				description: exp.user_name ? `By ${exp.user_name}` : undefined,
				experiment_id: exp.experiment_id,
				experiment_title: exp.title,
				protocol: exp.protocol,
				user_name: exp.user_name
			}))
			setExperiments(transformedExperiments)
		} catch (e: any) {
			console.error('Error fetching experiments:', e)
			setExperiments([])
		} finally {
			setExperimentsLoading(false)
		}
	}, [])

	useEffect(() => {
		setExperimentId(currentExperimentId)
	}, [currentExperimentId])

	useEffect(() => {
		fetchExperiments()
	}, [fetchExperiments])

	// Update selected experiment when experimentId changes
	useEffect(() => {
		if (experimentId && experiments.length > 0) {
			const found = experiments.find((exp) => exp.id.toString() === experimentId)
			setSelectedExperiment(found || null)
		}
	}, [experimentId, experiments])

	// Handle experiment selection from dropdown
	const handleExperimentSelect = async (experiment: Experiment) => {
		setExperimentChanging(true)
		setSelectedExperiment(experiment)
		const experimentIdNum = experiment.id.toString()
		setExperimentId(experimentIdNum)
		dispatch(updatecurrentExperimentId(experimentIdNum))

		// Call parent callback
		onExperimentChange?.(experimentIdNum)

		//todo..remove this spiner?
		// Send RPC call to backend to notify experiment change
		try {
			// await sendExperimentChangeRPC(experimentIdNum.toString())
			// Show loading for 2 seconds to allow backend to process
			await new Promise((resolve) => setTimeout(resolve, 2000))
		} catch (error) {
			console.error('Failed to notify backend of experiment change:', error)
		} finally {
			setExperimentChanging(false)
		}
	}

	// // Send RPC call to backend to notify experiment change
	// const sendExperimentChangeRPC = async (newExperimentId: string) => {
	// 	try {
	// 		if (room && localParticipant) {
	// 			const agentParticipant = Array.from(room.remoteParticipants.values()).find((participant) => participant.isAgent)

	// 			if (!agentParticipant) {
	// 				console.warn('No agent participant found in room')
	// 				return
	// 			}

	// 			const payload = {
	// 				experimentId: newExperimentId,
	// 				timestamp: new Date().toISOString()
	// 			}

	// 			const response = await localParticipant.performRpc({
	// 				destinationIdentity: agentParticipant.identity,
	// 				method: 'change_experiment',
	// 				payload: JSON.stringify(payload),
	// 				responseTimeout: 10000
	// 			})

	// 			console.log('Experiment change RPC sent to agent:', agentParticipant.identity, 'for experiment:', newExperimentId)
	// 		} else {
	// 			console.warn('No LiveKit room or localParticipant available for RPC call')
	// 		}
	// 	} catch (error) {
	// 		console.error('Failed to send experiment change RPC:', error)
	// 		throw error
	// 	}
	// }

	const getDisplayText = () => {
		if (experimentsLoading) return 'Loading...'
		if (experimentChanging) return 'Switching...'
		if (selectedExperiment) return selectedExperiment.name + ' ' + selectedExperiment.experiment_id
		if (experimentId) return `Experiment ${experimentId}`
		return 'Select Experiment'
	}

	const triggerClassName = compact ? 'group rese-experiment-drop inline-flex max-h-8 items-center gap-2 rounded-md hover:bg-accent hover:text-accent-foreground bg-background border border-border px-3 py-1 text-foreground text-sm transition-colors font-medium min-w-32 justify-between' : 'group inline-flex max-h-10 items-center gap-2 rounded-lg hover:bg-accent hover:text-accent-foreground bg-background border border-border px-3 py-2 text-foreground text-sm transition-colors font-medium min-w-48 justify-between'

	if (experimentChanging) {
		return (
			<div className={triggerClassName.replace('hover:bg-accent hover:text-accent-foreground', 'bg-muted')}>
				<div className="flex items-center gap-2">
					<LoadingSVG diameter={14} />
					<span className="truncate">Switching...</span>
				</div>
			</div>
		)
	}

	return (
		<DropdownMenu.Root modal={false}>
			<DropdownMenu.Trigger className={triggerClassName}>
				<span className="truncate text-[12px] lg:text-[14px]">{getDisplayText()}</span>
				<ChevronIcon />
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content className="z-50 flex w-80 flex-col gap-0 overflow-hidden rounded-lg text-foreground border border-border bg-popover shadow-lg py-2 text-[12px] lg:text-sm max-h-64 overflow-y-auto" sideOffset={5} collisionPadding={16} align="center">
					{experimentsLoading ? (
						<div className="flex items-center justify-center py-4">
							<LoadingSVG diameter={20} />
							<span className="ml-2 text-muted-foreground">Loading experiments...</span>
						</div>
					) : experiments.length === 0 ? (
						<div className="px-4 py-3 text-muted-foreground text-center">No experiments found</div>
					) : (
						experiments.map((experiment) => (
							<DropdownMenu.Item key={experiment.id} onSelect={() => handleExperimentSelect(experiment)} className="flex max-w-full flex-col items-start gap-1 px-4 py-3 text-[12px] lg:text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer focus:outline-none focus:bg-accent focus:text-accent-foreground rounded-md mx-1 transition-colors">
								<div className="flex items-center gap-2 w-full">
									<div className={`w-2 h-2 rounded-full ${selectedExperiment?.id === experiment.id ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
									<span className="font-medium truncate flex-1">{experiment.name}</span>
									<span className="text-xs text-muted-foreground font-mono">{experiment.id}</span>
								</div>
								{experiment.description && <p className="text-xs text-muted-foreground ml-4 truncate w-full">{experiment.description}</p>}
							</DropdownMenu.Item>
						))
					)}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	)
}
