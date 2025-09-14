import React, {useState, useEffect} from 'react'
import {Card, Typography, Button, Select, Input, Checkbox, Alert, Spin, Space, Tag, Timeline, Modal, Divider} from 'antd'
import {ExperimentOutlined, PlayCircleOutlined, FileTextOutlined} from '@ant-design/icons'

import {useRouter} from 'next/router'

import {MainHeading} from '../common/MainHeading'
import {cn} from '@/lib/util'

import {useDispatch, useSelector} from 'react-redux'
import {RootState, AppDispatch} from '@/store'

import {updatecurrentExperimentId, updateLocation} from '@/store/slices/authSlice'
import {doLoadExperiment, doGetExperiments, doCreateSession, doGenerateELN} from '@/api'

interface StartExperimentCardProps {}

export const StartExperimentCard = ({}: StartExperimentCardProps) => {
	const router = useRouter()
	const dispatch = useDispatch<AppDispatch>()
	const {currentOrganization} = useSelector((state: RootState) => state.auth)

	const [experimentId, setExperimentId] = useState<number | null>(null)
	const [currentExperiment, setCurrentExperiment] = useState<string>('')
	const [continueRun, setContinueRun] = useState<boolean>(false)
	// const [saveFolder, setSaveFolder] = useState<string>('')
	const [folderExists, setFolderExists] = useState<boolean>(false)
	const [loading, setLoading] = useState<boolean>(false)
	// const [startingExperiment, setStartingExperiment] = useState<boolean>(false)
	const [experimentSummary, setExperimentSummary] = useState<any>(null)
	const [experimentalLogs, setExperimentalLogs] = useState<any[]>([])
	const [showNotebook, setShowNotebook] = useState<boolean>(false)
	const [notebookContent, setNotebookContent] = useState<string>('')
	const [generatingDocument, setGeneratingDocument] = useState<boolean>(false)
	const [selectedExperiment, setSelectedExperiment] = useState<any>(null)

	const [experimentsLoading, setEexperimentsLoading] = useState<boolean>(false)
	const [experiments, setExperiments] = useState<any[]>([])

	const {Title, Text} = Typography
	const {TextArea} = Input

	useEffect(() => {
		const fetchExperiments = async () => {
			try {
				setEexperimentsLoading(true)
				const response = await doGetExperiments({orgId: currentOrganization?.org_id!})
				setExperiments(response.experiments || [])
				setEexperimentsLoading(false)
			} catch (err) {
				console.error('Failed to fetch experiments:', err)
			}
		}
		fetchExperiments()
	}, [currentOrganization?.org_id])

	const loadExperimentDetails = async (experimentId: string) => {
		setLoading(true)
		try {
			const data = await doLoadExperiment({experimentId: experimentId, orgId: currentOrganization?.org_id!})
			if (data.exists) {
				setCurrentExperiment(data.protocol)
				setFolderExists(true)
				setContinueRun(true)
				setExperimentSummary(data.summary)
				setExperimentalLogs(data.experimentalLogs || [])
			} else {
				setFolderExists(false)
				setContinueRun(false)
				setExperimentSummary(null)
				setExperimentalLogs([])
			}
		} catch (error) {
			console.error('Failed to load experiment details:', error)
			setFolderExists(false)
			setContinueRun(false)
			setExperimentSummary(null)
			setExperimentalLogs([])
		} finally {
			setLoading(false)
		}
	}

	// Function to get user's location
	const getUserLocation = (): Promise<{latitude: number; longitude: number}> => {
		return new Promise((resolve, reject) => {
			// Check if we're in a browser environment
			if (typeof window === 'undefined' || typeof navigator === 'undefined') {
				console.warn('Not in browser environment, using default location')
				resolve({
					latitude: 0,
					longitude: 0
				})
				return
			}

			if (!navigator.geolocation) {
				console.warn('Geolocation is not supported by this browser')
				resolve({
					latitude: 0,
					longitude: 0
				})
				return
			}

			navigator.geolocation.getCurrentPosition(
				(position) => {
					resolve({
						latitude: position.coords.latitude,
						longitude: position.coords.longitude
					})
				},
				(error) => {
					console.warn('Failed to get location:', error.message)
					// Provide default coordinates if location fails
					// This handles cases where user denies permission or HTTPS is not used
					resolve({
						latitude: 0,
						longitude: 0
					})
				},
				{
					enableHighAccuracy: false, // Changed to false for better compatibility
					timeout: 5000, // Reduced timeout
					maximumAge: 300000 // Cache for 5 minutes
				}
			)
		})
	}

	const handleStartRun = async () => {
		if (!selectedExperiment) {
			alert('Please select an experiment')
			return
		}
		try {
			// setStartingExperiment(true)
			const location = await getUserLocation()
			dispatch(updateLocation({latitude: location.latitude.toString(), longitude: location.longitude.toString()}))
			dispatch(updatecurrentExperimentId(selectedExperiment.experiment_id))
			router.push('/experiment')
		} catch (error) {
			console.error('Failed to create experiment:', error)
			alert(`Failed to create experiment: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	const handleGenerateNotebook = async () => {
		if (!selectedExperiment) {
			alert('Please select an experiment')
			return
		}
		setGeneratingDocument(true)
		try {
			const response = await doGenerateELN({
				experimentId: selectedExperiment.experiment_id,
				send_email: false,
				orgId: selectedExperiment?.org_id!
			})
			// Get the blob and download it
			const blob = await response.blob()
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `experiment_${selectedExperiment.experiment_id}_eln.docx`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			window.URL.revokeObjectURL(url)

			console.log(`Successfully generated and downloaded ELN for experiment ${selectedExperiment.experiment_id}`)
		} catch (error) {
			console.error('Failed to generate ELN document:', error)
			if (error instanceof Error && error.name === 'AbortError') {
				alert('ELN generation timed out. The document may be too large or the server is busy. Please try again.')
			} else {
				alert(`Failed to generate ELN document: ${error instanceof Error ? error.message : 'Unknown error'}`)
			}
		} finally {
			setGeneratingDocument(false)
		}
	}

	return (
		<>
			<Card>
				<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
					<MainHeading icon={<ExperimentOutlined />} title={'Start New Experiment'} text={'Select an experiment and configure your session parameters'} />
					<div>
						<Space size="middle" wrap>
							<Button icon={<FileTextOutlined />} onClick={handleGenerateNotebook} loading={generatingDocument} size="large" className="flex-1">
								Generate ELN Document
							</Button>
							<Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStartRun} size="large" className="flex-1">
								Start Experiment
							</Button>
						</Space>
					</div>
				</div>
				{generatingDocument && <Alert message="Generating the ELN may take a few minutes. The file will be automatically downloaded once it’s ready." type="info" showIcon className="mt-2 mb-2" />}
				<Divider />

				<Space direction="vertical" size="large" className="w-full">
					{/* Experiment Selection */}
					<div>
						<Text strong className="block mb-2">
							Select Experiment
						</Text>
						{experimentsLoading ? (
							<div className="py-3 text-center">
								<Spin /> Loading experiments...
							</div>
						) : (
							<Select
								placeholder="Select an experiment..."
								className="w-full"
								size="large"
								value={selectedExperiment?.experiment_id || undefined}
								onChange={(value) => {
									const experiment = experiments?.find((exp: any) => exp.experiment_id === value)
									console.log(experiment)
									setSelectedExperiment(experiment || null)
									setExperimentId(experiment ? experiment.experiment_id : null)
									// setCurrentExperiment(experiment ? experiment.protocol : '')
									// Load experiment details when selected
									if (experiment) {
										loadExperimentDetails(experiment.experiment_id.toString())
									} else {
										setExperimentSummary(null)
										setExperimentalLogs([])
									}
								}}
								options={experiments?.map((experiment: any) => ({
									value: experiment.experiment_id,
									label: `${experiment.experiment_id} - ${experiment.title}`
								}))}
							/>
						)}

						{experiments?.length === 0 && !experimentsLoading && <Alert message="No experiments found. Please register an experiment first." type="warning" showIcon className="mt-2" />}

						{loading && <Alert message="Loading experiment data..." type="info" showIcon className="mt-2" />}

						{selectedExperiment && (
							<Card size="small" className="mt-4 bg-blue-50">
								<Title level={5} className="m-0 mb-3 text-blue-600">
									Selected Experiment
								</Title>
								<Space direction="vertical" size="small">
									<Text>
										<Text strong>ID:</Text> {selectedExperiment.experiment_id}
									</Text>
									<Text>
										<Text strong>Title:</Text> {selectedExperiment.title}
									</Text>
									<Text>
										<Text strong>Last modified by:</Text> {selectedExperiment.last_modified_by}
									</Text>
									<Text>
										<Text strong>Created:</Text> {new Date(selectedExperiment.created_at).toLocaleString()}
									</Text>
								</Space>
							</Card>
						)}
					</div>

					{/* Experiment Protocol */}
					<div>
						<Text strong className="block mb-2">
							Experiment Protocol {selectedExperiment ? '(Auto-loaded)' : '(Select an experiment)'}
						</Text>
						<TextArea rows={8} value={currentExperiment} readOnly={!!selectedExperiment} onChange={(e) => !selectedExperiment && setCurrentExperiment(e.target.value)} placeholder={selectedExperiment ? 'Protocol will appear here when you select an experiment...' : 'Select an experiment to load its protocol...'} className={cn(selectedExperiment && 'bg-muted cursor-not-allowed')} />
						{selectedExperiment && <Alert message="Protocol loaded from selected experiment. To modify, register a new experiment." type="info" showIcon className="mt-2" />}
					</div>

					{/* Continue Run */}
					<div>
						<Checkbox checked={continueRun} onChange={(e) => !folderExists && setContinueRun(e.target.checked)} disabled={folderExists}>
							Continue Run? {folderExists && '(Auto-selected - experiment folder exists)'}
						</Checkbox>
					</div>

					{/* Save Folder */}
					{/* <div>
						<Text strong className="block mb-2">
							Save Folder (Auto-generated)
						</Text>
						{selectedExperiment?.save_location ? (
							<Card size="small" className="bg-muted">
								<Text code className="break-all">
									{selectedExperiment.save_location}
								</Text>
							</Card>
						) : (
							<Card size="small" className="bg-muted">
								<Text type="secondary" italic>
									Select an experiment to see the save location
								</Text>
							</Card>
						)}
						<Text className="text-xs text-muted-foreground mt-2 block">Experiment data will be saved to this automatically generated path.</Text>
					</div> */}

					{/* Experimental Logs */}
					{experimentalLogs.length > 0 && (
						<div>
							<Title level={4} className="mb-4">
								📋 Experimental Logs ({experimentalLogs.length} entries)
							</Title>
							<Card className="max-h-96 overflow-auto bg-card">
								<Timeline mode="left">
									{experimentalLogs
										.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
										.map((log, index) => (
											<Timeline.Item className="time-line-exp" key={log.id || index} color={log.speaker === 'user' ? '#1890ff' : log.speaker === 'assistant' ? '#52c41a' : '#d9d9d9'} label={<Text className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</Text>}>
												<Card size="small" className="mb-2">
													<Space direction="vertical" size="small" className="w-full">
														<Space wrap>
															<Tag color={log.speaker === 'user' ? 'blue' : log.speaker === 'assistant' ? 'green' : 'default'} className="m-0">
																{log.speaker === 'user' ? '👤' : log.speaker === 'assistant' ? '🤖' : '💭'} {log.speaker}
															</Tag>
															{log.assistantActive !== null && (
																<Tag color={log.assistantActive ? 'success' : 'error'} className="m-0">
																	{log.assistantActive ? '✅ Active' : '⏸️ Inactive'}
																</Tag>
															)}
															<Text className="text-xs text-muted-foreground">Session: {log.sessionUuid ? log.sessionUuid.substring(0, 8) : 'Unknown'}</Text>
														</Space>
														<Text className="text-sm leading-6">{log.content && log.content.length > 150 ? `${log.content.substring(0, 150)}...` : log.content || 'No content'}</Text>
													</Space>
												</Card>
											</Timeline.Item>
										))}
								</Timeline>
							</Card>
						</div>
					)}

					{/* Action Buttons */}
					{/* <div className="border-t border-border pt-6">
						<Space size="middle" className="w-full flex-wrap">
							<Button icon={<FileTextOutlined />} onClick={handleGenerateNotebook} loading={generatingDocument} size="large" className="flex-1">
								Generate ELN Document
							</Button>
							<Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStartRun} size="large" className="flex-1">
								Start Experiment
							</Button>
						</Space>
						{<Alert message="Generating the ELN may take a few minutes. The file will be automatically downloaded once it’s ready." type="info" showIcon className="mt-2" />}
					</div> */}
				</Space>
			</Card>

			{/* Notebook Modal */}
			<Modal
				title={
					<Space>
						<FileTextOutlined />
						Experiment {selectedExperiment?.experiment_id} Notebook
					</Space>
				}
				open={showNotebook}
				onCancel={() => setShowNotebook(false)}
				footer={null}
				width="80%"
				className="max-w-6xl">
				<div className="max-h-96 overflow-auto">
					<pre className="whitespace-pre-wrap text-sm leading-6 bg-muted border border-border p-6 rounded-lg">{notebookContent}</pre>
				</div>
			</Modal>
		</>
	)
}
