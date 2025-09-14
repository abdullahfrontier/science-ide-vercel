import React, {useState} from 'react'
import dynamic from 'next/dynamic'
import {useSelector} from 'react-redux'
import {RootState} from '@/store'

import {Layout, Typography, Input, Card, Button, Alert, Space, Tabs, message, Form, Radio} from 'antd'
import {FileTextOutlined, DownloadOutlined, ExperimentOutlined, CheckSquareOutlined, SafetyCertificateOutlined, CalculatorOutlined, PlusOutlined, UserOutlined, EditOutlined} from '@ant-design/icons'
import {BaseForm} from '@/components/common/BaseForm'
import {useFormValidation} from '@/hooks/useFormValidation'
import CritiqueSection from '../designChecker/CritiqueSection'
import {doRegisterExperiment} from '@/api'

const RichTextEditor = dynamic(() => import('../designChecker/RichTextEditor'), {
	ssr: false,
	loading: () => (
		<div
			style={{
				height: '350px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				border: '1px solid #d9d9d9',
				borderRadius: '6px',
				backgroundColor: '#fafafa'
			}}>
			Loading editor...
		</div>
	)
})

const ReproducibilityTable = dynamic(() => import('../designChecker/ReproducibilityTable'), {
	ssr: false,
	loading: () => <div>Loading reproducibility table...</div>
})

import PowerAnalysisSection from '../designChecker/PowerAnalysisSection'
import {performOpenAIAction} from '../../services/supabaseService'
import {exportToWord} from '../../services/documentService'
import {parseReproducibilityResponse, ReproducibilityRow} from '../../utils/formatters'

const {Content} = Layout
const {Title, Paragraph, Text} = Typography
const {TextArea} = Input

function VerifyProtocolPage() {
	const [title, setTitle] = useState('')
	const [documentText, setDocumentText] = useState('')
	const [critiqueResults, setCritiqueResults] = useState('')
	const [parsedCritiqueData, setParsedCritiqueData] = useState<any>(null)
	const [reproducibilityData, setReproducibilityData] = useState<ReproducibilityRow[]>([])
	const [powerAnalysisResults, setPowerAnalysisResults] = useState<any>(null)
	const [critiqueLoading, setCritiqueLoading] = useState(false)
	const [reproducibilityLoading, setReproducibilityLoading] = useState(false)
	const [exportLoading, setExportLoading] = useState(false)
	const [error, setError] = useState('')
	const [activeTab, setActiveTab] = useState('1')
	const [contentType, setContentType] = useState<'raw' | 'modified'>('raw')
	const [form] = Form.useForm()

	const {currentOrganization} = useSelector((state: RootState) => state.auth)

	// Form validation hook for experiment creation
	const {
		loading: createExperimentLoading,
		error: experimentError,
		success: experimentSuccess,
		handleSubmit,
		setError: setExperimentError,
		setSuccess: setExperimentSuccess,
		resetState
	} = useFormValidation({
		onSuccess: () => {
			message.success('Experiment created successfully!')
			form.resetFields()
		},
		resetOnSuccess: false
	})

	// Strip HTML tags from rich text for API calls
	const getPlainText = (html: string): string => {
		const div = document.createElement('div')
		div.innerHTML = html
		return div.textContent || div.innerText || ''
	}

	const handleCritique = async (selectedScopes: string[]) => {
		if (!documentText.trim() || !title.trim()) {
			setError('Please enter both a title and document text')
			return
		}

		if (!selectedScopes.length) {
			setError('Please select at least one design scope to analyze')
			return
		}

		setError('')
		setCritiqueLoading(true)

		try {
			const plainText = getPlainText(documentText)
			// Pass selected scopes to the API call
			const scopeContext = `Analyze the following design scopes: ${selectedScopes.join(', ')}`
			const response = await performOpenAIAction('critiqueProtocol', `${scopeContext}\n\n${plainText}`, title)
			if (response.success && response.result) {
				// Pass raw response directly to CritiqueSection for proper parsing
				setCritiqueResults(response.result)
			} else {
				setError(response.error || 'Failed to generate critique')
			}
		} catch (err) {
			setError('An error occurred while generating the critique')
		} finally {
			setCritiqueLoading(false)
		}
	}

	const handleReproducibilityCheck = async () => {
		if (!documentText.trim() || !title.trim()) {
			setError('Please enter both a title and document text')
			return
		}

		setError('')
		setReproducibilityLoading(true)

		try {
			const plainText = getPlainText(documentText)
			const response = await performOpenAIAction('reproducibilityCheck', plainText, title)

			if (response.success && response.result) {
				const parsedData = parseReproducibilityResponse(response.result)
				setReproducibilityData(parsedData)
			} else {
				setError(response.error || 'Failed to generate reproducibility check')
			}
		} catch (err) {
			setError('An error occurred while checking reproducibility')
		} finally {
			setReproducibilityLoading(false)
		}
	}

	const handleExportToWord = async () => {
		if (!title.trim()) {
			setError('Please enter a title before exporting')
			return
		}

		setError('')
		setExportLoading(true)

		try {
			const plainText = getPlainText(documentText)

			// Convert reproducibility data to text format for export
			let reproducibilityText = ''
			if (reproducibilityData.length > 0) {
				reproducibilityText = 'Reproducibility Risk Assessment:\n\n'
				reproducibilityData.forEach((row) => {
					reproducibilityText += `Step: ${row.step}\n`
					reproducibilityText += `Issue: ${row.issue}\n`
					reproducibilityText += `Why It Matters: ${row.whyItMatters}\n`
					reproducibilityText += `Your Notes: ${row.userInput || '[No notes entered]'}\n\n`
				})
			}

			// Generate critique text from only tracked items
			let trackedCritiqueText = ''
			if (parsedCritiqueData) {
				const sections: string[] = []

				// Add critical flaws if any are tracked
				const trackedCritical = parsedCritiqueData.criticalFlaws?.filter((item: any) => item.tracked) || []
				if (trackedCritical.length > 0) {
					sections.push('### Critical Design Flaws')
					trackedCritical.forEach((item: any, index: number) => {
						sections.push(`${index + 1}. ${item.text}`)
					})
					sections.push('')
				}

				// Add scope improvements if any are tracked
				if (parsedCritiqueData.scopeImprovements) {
					Object.entries(parsedCritiqueData.scopeImprovements).forEach(([scope, items]) => {
						const trackedItems = (items as any[]).filter((item: any) => item.tracked)
						if (trackedItems.length > 0) {
							const scopeLabel = scope
								.split('-')
								.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
								.join(' ')
							sections.push(`### ${scopeLabel} Improvements`)
							trackedItems.forEach((item: any, index: number) => {
								sections.push(`${index + 1}. ${item.text}`)
							})
							sections.push('')
						}
					})
				}

				trackedCritiqueText = sections.join('\n').trim()
			}

			await exportToWord({
				title,
				originalText: plainText,
				critiqueResults: trackedCritiqueText || undefined,
				reproducibilityResults: reproducibilityText || undefined,
				reproducibilityData: reproducibilityData.length > 0 ? reproducibilityData : undefined,
				powerAnalysisResults: powerAnalysisResults || undefined
			})
		} catch (err) {
			setError('Failed to export document')
		} finally {
			setExportLoading(false)
		}
	}

	const onExperimentFinish = async (values: any) => {
		await handleSubmit(async () => {
			const {experiment_title, protocol} = values
			return await doRegisterExperiment({title: experiment_title.trim(), protocol: protocol, orgId: currentOrganization?.org_id!})
		})
	}

	const generateModifiedContent = () => {
		const plainText = getPlainText(documentText)
		let modifiedContent = plainText

		// Add tracked critique improvements
		if (parsedCritiqueData) {
			const trackedSections: string[] = []

			// Add critical flaws if any are tracked
			const trackedCritical = parsedCritiqueData.criticalFlaws?.filter((item: any) => item.tracked) || []
			if (trackedCritical.length > 0) {
				trackedSections.push('\n\n=== CRITICAL IMPROVEMENTS ADDRESSED ===')
				trackedCritical.forEach((item: any, index: number) => {
					trackedSections.push(`${index + 1}. ${item.text}`)
				})
			}

			// Add scope improvements if any are tracked
			if (parsedCritiqueData.scopeImprovements) {
				Object.entries(parsedCritiqueData.scopeImprovements).forEach(([scope, items]) => {
					const trackedItems = (items as any[]).filter((item: any) => item.tracked)
					if (trackedItems.length > 0) {
						const scopeLabel = scope
							.split('-')
							.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
							.join(' ')
						trackedSections.push(`\n=== ${scopeLabel.toUpperCase()} IMPROVEMENTS ===`)
						trackedItems.forEach((item: any, index: number) => {
							trackedSections.push(`${index + 1}. ${item.text}`)
						})
					}
				})
			}

			if (trackedSections.length > 0) {
				modifiedContent = plainText + '\n\n' + trackedSections.join('\n')
			}
		}

		// Add reproducibility improvements
		if (reproducibilityData.length > 0) {
			const notes = reproducibilityData.filter((row) => row.userInput && row.userInput.trim()).map((row) => `• ${row.step}: ${row.userInput}`)

			if (notes.length > 0) {
				modifiedContent += '\n\n=== REPRODUCIBILITY IMPROVEMENTS ===\n' + notes.join('\n')
			}
		}

		// Add power analysis results
		if (powerAnalysisResults) {
			modifiedContent += '\n\n=== STATISTICAL POWER ANALYSIS ===\n'
			if (powerAnalysisResults.sampleSize) {
				modifiedContent += `Recommended sample size: ${powerAnalysisResults.sampleSize}\n`
			}
			if (powerAnalysisResults.notes) {
				modifiedContent += `Notes: ${powerAnalysisResults.notes}\n`
			}
		}

		return modifiedContent
	}

	const populateFormWithProtocol = () => {
		if (!title?.trim() || !documentText?.trim()) {
			message.warning('Please enter a title and protocol text first')
			return
		}

		const protocolContent = contentType === 'raw' ? getPlainText(documentText) : generateModifiedContent()

		form.setFieldsValue({
			experiment_title: title,
			protocol: protocolContent
		})

		const contentTypeLabel = contentType === 'raw' ? 'original' : 'modified with improvements'
		message.success(`Protocol data (${contentTypeLabel}) has been populated into the experiment form`)
	}

	return (
		<Layout className="app-container">
			<Content style={{margin: '0 auto', width: '100%'}}>
				<Card style={{marginBottom: 24}}>
					<Title level={2}>
						<CheckSquareOutlined />
						Verify Protocol
					</Title>
					<Paragraph>Get AI-powered critique and reproducibility suggestions for your protocol documents</Paragraph>

					{error && <Alert message={error} type="error" closable onClose={() => setError('')} style={{marginBottom: 24}} />}

					<Space direction="vertical" size="large" style={{width: '100%'}}>
						<div>
							<label style={{display: 'block', marginBottom: 8, fontWeight: 500}}>Protocol Verification Title</label>
							<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter a title for your protocol verification..." size="large" />
						</div>

						<div>
							<label style={{display: 'block', marginBottom: 8, fontWeight: 500}}>Protocol Document Text</label>
							<RichTextEditor value={documentText} onChange={setDocumentText} placeholder="Paste your protocol document text here. You can paste rich text from PDFs or Word documents..." />
						</div>
					</Space>
				</Card>

				{/* Verification Tabs */}
				<Card style={{marginBottom: 24}}>
					<Tabs
						activeKey={activeTab}
						onChange={setActiveTab}
						items={[
							{
								key: '1',
								label: (
									<Space>
										<ExperimentOutlined />
										Design Review
									</Space>
								),
								children: <CritiqueSection content={critiqueResults} loading={critiqueLoading} onRunCheck={handleCritique} buttonText="Find Improvements" emptyStateText="Select design scopes and click 'Find Improvements' to get AI-powered feedback" onUpdateParsedData={setParsedCritiqueData} />
							},
							{
								key: '2',
								label: (
									<Space>
										<SafetyCertificateOutlined />
										Reproducibility Risks
									</Space>
								),
								children: <ReproducibilityTable data={reproducibilityData} loading={reproducibilityLoading} onRunCheck={handleReproducibilityCheck} onDataChange={setReproducibilityData} />
							},
							{
								key: '3',
								label: (
									<Space>
										<CalculatorOutlined />
										Sample Size
									</Space>
								),
								children: <PowerAnalysisSection onResultsChange={setPowerAnalysisResults} />
							},
							{
								key: '4',
								label: (
									<Space>
										<DownloadOutlined />
										Export Analysis
									</Space>
								),
								children: (
									<Card style={{textAlign: 'center'}}>
										<Space direction="vertical" size="large">
											<Button type="primary" size="large" icon={<DownloadOutlined />} loading={exportLoading} disabled={!title.trim()} onClick={handleExportToWord}>
												Export Analysis Document
											</Button>
											<Paragraph type="secondary">Compiles your original text, tracked suggestions, and sample size calculations into a formatted Word document</Paragraph>
										</Space>
									</Card>
								)
							},
							{
								key: '5',
								label: (
									<Space>
										<PlusOutlined />
										Create Experiment
									</Space>
								),
								children: (
									<BaseForm
										title="Create Experiment from Protocol"
										icon={<PlusOutlined />}
										onFinish={onExperimentFinish}
										loading={createExperimentLoading}
										error={experimentError}
										success={experimentSuccess}
										successMessage="Your experiment has been created and is now available for selection in the Start Experiment tab."
										successAction={{
											label: 'Create Another Experiment',
											onClick: () => {
												resetState()
												form.resetFields()
											}
										}}
										submitButtonText={'Create Experiment'}
										formProps={{
											form: form,
											layout: 'vertical',
											initialValues: {
												experiment_title: '',
												protocol: ''
											}
										}}>
										{/* Content Type Selection */}
										<Card size="small" style={{marginBottom: 16, backgroundColor: 'var(--muted)'}}>
											<Space direction="vertical" size="small" style={{width: '100%'}}>
												<Text strong>Protocol Content Type</Text>
												<Radio.Group value={contentType} onChange={(e) => setContentType(e.target.value)} style={{width: '100%'}}>
													<Space direction="vertical" style={{width: '100%'}}>
														<Radio value="raw">
															<Space>
																<FileTextOutlined />
																<div>
																	<div style={{fontWeight: 500}}>Original Protocol Text</div>
																	<div style={{fontSize: '12px', color: '#666'}}>Use the raw protocol text as entered above</div>
																</div>
															</Space>
														</Radio>
														<Radio value="modified">
															<Space>
																<EditOutlined />
																<div>
																	<div style={{fontWeight: 500}}>Enhanced Protocol with Improvements</div>
																	<div style={{fontSize: '12px', color: '#666'}}>Include tracked design critique, reproducibility notes, and power analysis</div>
																</div>
															</Space>
														</Radio>
													</Space>
												</Radio.Group>

												<Button type="primary" icon={<FileTextOutlined />} onClick={populateFormWithProtocol} disabled={!title.trim() || !documentText.trim()} style={{marginTop: '8px'}}>
													Populate Form with {contentType === 'raw' ? 'Original' : 'Enhanced'} Protocol
												</Button>
											</Space>
										</Card>

										{/* <Form.Item label="Experiment ID (auto-generated)">
											<Input value={experimentIdLoading ? 'Generating...' : nextExperimentId?.toString() || ''} readOnly style={{backgroundColor: 'var(--muted)', cursor: 'not-allowed'}} />
										</Form.Item> */}

										{/* Title Input */}
										<Form.Item name="experiment_title" label="Experiment Title" rules={[{required: true, message: 'Please enter an experiment title'}]}>
											<Input placeholder="Enter a descriptive title for your experiment" />
										</Form.Item>

										{/* <Form.Item name="userId" label="Primary Researcher" rules={[{required: true, message: 'Please select a researcher'}]}>
											<Select placeholder="Select a researcher..." loading={usersLoading} style={{width: '100%'}}>
												{users?.map((user: any) => (
													<Select.Option key={user.id} value={user.id}>
														{user.name} ({user.email})
													</Select.Option>
												))}
											</Select>
											{users?.length === 0 && !usersLoading && <div className="mt-1 text-xs text-accent">No users found. Please register a user first.</div>}
										</Form.Item> */}

										{/* <Form.Item>
											<Card size="small" style={{backgroundColor: 'var(--muted)'}}>
												<Form.Item name="is_active" valuePropName="checked" style={{marginBottom: 0}}>
													<Checkbox>
														<div>
															<span className="text-sm font-medium text-foreground block">Mark as Active Experiment</span>
															<p className="mt-1 text-xs text-muted-foreground">Active experiments are prioritized in experiment selection and appear at the top of lists</p>
														</div>
													</Checkbox>
												</Form.Item>
											</Card>
										</Form.Item> */}

										{/* Protocol Input */}
										<Form.Item name="protocol" label="Experiment Protocol" rules={[{required: true, message: 'Please enter the experiment protocol'}]}>
											<TextArea rows={8} placeholder="Describe your experiment protocol, methodology, and objectives..." />
										</Form.Item>

										{/* Information Card */}
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
								)
							}
						]}
					/>
				</Card>
			</Content>
		</Layout>
	)
}

export default VerifyProtocolPage
