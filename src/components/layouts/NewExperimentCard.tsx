import React, {useState, useEffect} from 'react'
import {Form, Input, Card, Typography, Space, Select, Radio} from 'antd'
import {ExperimentOutlined, EditOutlined, PlusOutlined} from '@ant-design/icons'
import {BaseForm} from '@/components/common/BaseForm'
import {useFormValidation} from '@/hooks/useFormValidation'
import {StructuredProtocolEditor} from '@/components/experiment/StructuredProtocolEditor'
import {useSelector} from 'react-redux'
import {RootState} from '@/store'
import {doGetExperiments, doLoadExperiment, doRegisterExperiment, doUpdateExperiment, doUpdateExperimentProtocol} from '@/api'

export const NewExperimentCard = () => {
	const [form] = Form.useForm()
	const {currentOrganization} = useSelector((state: RootState) => state.auth)

	const [mode, setMode] = useState<'create' | 'edit'>('create')

	const [experimentsLoading, setEexperimentsLoading] = useState<boolean>(false)
	const [experimentDataLoading, setExperimentDataLoading] = useState<boolean>(false)
	const [selectedExperimentId, setSelectedExperimentId] = useState<string | ''>('')

	const [experiments, setExperiments] = useState<any[]>([])
	const [experimentData, setExperimentData] = useState<any>(null)

	const {Text} = Typography
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

	const {loading, error, success, handleSubmit, setError, setSuccess, resetState} = useFormValidation({
		onSuccess: () => {},
		resetOnSuccess: false
	})

	useEffect(() => {
		resetForm()
	}, [mode, resetState, form])

	useEffect(() => {
		if (mode === 'edit' && experimentData) {
			form.setFieldsValue({
				experiment_title: experimentData.title || '',
				protocol: experimentData.protocol || ''
			})
		}
	}, [mode, experimentData, form])

	const fetchExperimentData = async (experiment_id: string) => {
		setExperimentDataLoading(true)
		setSelectedExperimentId(experiment_id)
		try {
			const data = await doLoadExperiment({experimentId: experiment_id, orgId: currentOrganization?.org_id!})
			setExperimentData(data)
			setExperimentDataLoading(false)
		} catch (err) {
			console.error('Failed to fetch experiments:', err)
		}
	}

	const onFinish = async (values: any) => {
		await handleSubmit(async () => {
			const {experiment_title, protocol} = values
			const byteSize = new TextEncoder().encode(protocol).length
			if (byteSize > MAX_BYTES) {
				throw new Error('Protocol text exceeds 10MB limit')
			}
			if (mode === 'create') {
				await doRegisterExperiment({title: experiment_title.trim(), protocol: protocol, orgId: currentOrganization?.org_id!})
				const data = await doGetExperiments({orgId: currentOrganization?.org_id!})
				setExperiments(data.experiments || [])
			} else {
				if (!experiment_title.trim() || protocol === undefined) {
					throw new Error('Please fill in all fields')
				}
				const titleChanged = experiment_title.trim() !== experimentData?.title
				const protocolChanged = protocol !== experimentData?.protocol
				const tasks: Promise<any>[] = []
				if (titleChanged) {
					tasks.push(doUpdateExperiment({title: experiment_title.trim(), experimentId: selectedExperimentId, orgId: currentOrganization?.org_id!}))
				}
				if (protocolChanged) {
					tasks.push(doUpdateExperimentProtocol({protocol: protocol, experimentId: selectedExperimentId, orgId: currentOrganization?.org_id!}))
				}
				if (tasks.length === 0) {
					throw new Error('No changes detected')
				}
				await Promise.all(tasks)
				return {
					message: `Experiment ${titleChanged && protocolChanged ? 'title and protocol' : titleChanged ? 'title' : 'protocol'} updated successfully`
				}
			}
		})
	}

	const resetForm = () => {
		resetState()
		setExperimentData(null)
		setSelectedExperimentId('')
		form.resetFields()
	}

	const getInitialValues = () => {
		if (mode === 'edit' && experimentData) {
			return {
				experiment_title: experimentData.title || '',
				protocol: experimentData.protocol || ''
			}
		}
		return {
			experiment_title: '',
			protocol: ''
		}
	}

	const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
	const [sizeInMB, setSizeInMB] = useState(0)

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const text = e.target.value
		const byteSize = new TextEncoder().encode(text).length
		setSizeInMB(byteSize / (1024 * 1024)) // convert to MB
	}

	return (
		<div>
			<Card style={{marginBottom: '16px'}}>
				<Radio.Group
					value={mode}
					onChange={(e) => {
						setMode(e.target.value)
						resetForm()
					}}>
					<Radio.Button value="create">
						<PlusOutlined /> Create Experiment
					</Radio.Button>
					<Radio.Button value="edit">
						<EditOutlined /> Edit Experiment
					</Radio.Button>
				</Radio.Group>
			</Card>

			<BaseForm
				title={mode === 'create' ? 'Create New Experiment' : 'Edit Experiment'}
				icon={<ExperimentOutlined />}
				onFinish={onFinish}
				loading={loading || (mode === 'edit' && experimentDataLoading)}
				error={error}
				success={success}
				successMessage={`Your experiment has been ${mode === 'create' ? 'registered and is now available for selection in the Start Experiment tab' : 'updated with the new information'}.`}
				successAction={{
					label: mode === 'create' ? 'Register Another Experiment' : 'Edit Another Experiment',
					onClick: resetForm
				}}
				submitButtonText={mode === 'create' ? 'Create Experiment' : 'Update Experiment'}
				formProps={{
					form: form,
					initialValues: getInitialValues(),
					key: `${mode}-${selectedExperimentId || 'new'}-${experimentData ? 'loaded' : 'empty'}`
				}}>
				{/* Experiment Selection for Edit Mode */}
				{mode === 'edit' && (
					<Form.Item label="Select Experiment to Edit" required>
						{experimentsLoading ? (
							<div className="py-2 px-3 text-muted-foreground">Loading experiments...</div>
						) : (
							<Select value={selectedExperimentId} onChange={(value) => fetchExperimentData(value)} placeholder="Select an experiment..." style={{width: '100%'}} loading={experimentsLoading}>
								{experiments.map((experiment: any) => (
									<Select.Option key={experiment.experiment_id} value={experiment.experiment_id}>
										{experiment.experiment_id} - {experiment.title}
									</Select.Option>
								))}
							</Select>
						)}
						{experiments?.length === 0 && !experimentsLoading && <div className="mt-1 text-xs text-accent">No experiments found. Please create an experiment first.</div>}
						{experimentDataLoading && <div className="mt-2 text-xs text-muted-foreground">Loading experiment data...</div>}
					</Form.Item>
				)}

				{(mode === 'create' || (mode === 'edit' && experimentData)) && (
					<Form.Item name="experiment_title" label="Experiment Title" rules={[{required: true, message: 'Please enter an experiment title'}]}>
						<Input placeholder="Enter a descriptive title for your experiment" />
					</Form.Item>
				)}

				{mode === 'create' && (
					<Form.Item name="protocol" label="Experiment Protocol" rules={[{required: true, message: 'Please enter the experiment protocol'}]}>
						<div className="relative">
							<TextArea onChange={handleChange} rows={8} placeholder="Describe your experiment protocol, methodology, and objectives..." />
							<div className="absolute bottom-2 right-2 text-xs text-gray-500">{sizeInMB.toFixed(2)} MB / 10 MB</div>
						</div>
					</Form.Item>
				)}

				{mode === 'edit' && experimentData && (
					<Form.Item name="protocol" label="Experiment Protocol" rules={[{required: true, message: 'Please enter the experiment protocol'}]}>
						<StructuredProtocolEditor placeholder="Describe your experiment protocol, methodology, and objectives..." />
					</Form.Item>
				)}

				{/* Note: Error handling and submit button are handled by BaseForm */}

				<Card size="small" style={{marginTop: '24px', backgroundColor: '#f9f9f9'}}>
					<Space direction="vertical" size="small">
						<Text strong>Registration Information</Text>
						<ul style={{margin: 0, paddingLeft: '20px'}}>
							<li>
								<Text type="secondary" style={{fontSize: '13px'}}>
									Your experiment will be stored securely in the database
								</Text>
							</li>
							<li>
								<Text type="secondary" style={{fontSize: '13px'}}>
									Once registered, the experiment will be available for selection in Start Experiment
								</Text>
							</li>
							<li>
								<Text type="secondary" style={{fontSize: '13px'}}>
									Each experiment gets a unique identifier and save location
								</Text>
							</li>
							<li>
								<Text type="secondary" style={{fontSize: '13px'}}>
									You can register multiple experiments with different IDs
								</Text>
							</li>
						</ul>
					</Space>
				</Card>
			</BaseForm>
		</div>
	)
}
