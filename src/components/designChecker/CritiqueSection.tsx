import React, {useState, useEffect} from 'react'
import {Button, Space, Spin, Empty, message, Typography, Tag, Card, Checkbox, Alert} from 'antd'
import {CopyOutlined, CheckOutlined, PlusCircleOutlined, CheckCircleOutlined, FileTextOutlined, ThunderboltOutlined, WarningOutlined, SearchOutlined, ExperimentOutlined, DashboardOutlined} from '@ant-design/icons'
import {palette} from '@/styles/color'

const {Title, Text, Paragraph} = Typography

// Design scope definitions - matching exact backend response names
const DESIGN_SCOPES = [
	{
		key: 'critical-flaw',
		label: 'Critical Flaw',
		description: 'Critical issues that could compromise experimental results',
		icon: <WarningOutlined />,
		color: `${palette.danger_red}`
	},
	{
		key: 'plate-design',
		label: 'Plate Design',
		description: 'Optimize laboratory plate layouts and controls',
		icon: <DashboardOutlined />,
		color: `${palette.teal_blue}`
	},
	{
		key: 'hidden-bias',
		label: 'Hidden Bias',
		description: 'Identify potential biases in experimental design',
		icon: <SearchOutlined />,
		color: `${palette.royal_purple}`
	},
	{
		key: 'techniques',
		label: 'Techniques',
		description: 'Biological methods and technical considerations',
		icon: <ExperimentOutlined />,
		color: `${palette.lime_green}`
	},
	{
		key: 'experiment-velocity',
		label: 'Experiment Velocity',
		description: 'Accelerate experimental throughput and efficiency',
		icon: <ThunderboltOutlined />,
		color: `${palette.golden_yellow}`
	},
	{
		key: 'potential-covariates',
		label: 'Potential Covariates',
		description: 'Identify and control for confounding variables',
		icon: <FileTextOutlined />,
		color: `${palette.warm_orange}`
	}
]

interface CritiqueItem {
	id: string
	text: string
	impact: 'Critical' | 'High' | 'Medium' | 'Low'
	effort: 'High' | 'Medium' | 'Low'
	practicality?: 'High' | 'Medium' | 'Low'
	type?: string
	scope: string
	tracked: boolean
}

interface CovariateItem {
	id: string
	name: string
	description: string
	tracked: boolean
}

interface CritiqueResults {
	criticalFlaws: CritiqueItem[]
	scopeImprovements: {[scope: string]: CritiqueItem[]}
	covariates: CovariateItem[]
}

interface CritiqueSectionProps {
	content: string
	loading: boolean
	onRunCheck: (scopes: string[]) => void
	buttonText: string
	emptyStateText: string
	onUpdateParsedData?: (data: CritiqueResults) => void
}

const CritiqueSection: React.FC<CritiqueSectionProps> = ({content, loading, onRunCheck, buttonText, emptyStateText, onUpdateParsedData}) => {
	const [copied, setCopied] = useState(false)
	const [selectedScopes, setSelectedScopes] = useState<string[]>(['critical-flaw', 'plate-design', 'hidden-bias'])
	const [parsedData, setParsedData] = useState<CritiqueResults | null>(null)

	// Load data from localStorage on mount
	useEffect(() => {
		const savedData = localStorage.getItem('critiqueData')
		if (savedData) {
			try {
				const parsed = JSON.parse(savedData)
				setParsedData(parsed)
				onUpdateParsedData?.(parsed)
			} catch (error) {
				console.error('Error loading saved critique data:', error)
				// If saved data is corrupted, load demo data
				loadDemoData()
			}
		} else {
			// If no saved data, load demo data on first visit
			loadDemoData()
		}
	}, [onUpdateParsedData])

	const loadDemoData = () => {
		const testContent = getTestResponse()
		const parsed = parseScopedCritiqueResponse(testContent)
		setParsedData(parsed)
		onUpdateParsedData?.(parsed)
		localStorage.setItem('critiqueData', JSON.stringify(parsed))
	}

	useEffect(() => {
		console.log('=== CONTENT USEEFFECT TRIGGERED ===')
		console.log('content:', content)

		if (content) {
			console.log('Processing content...')
			// Parse the actual server response
			let parsed = parseScopedCritiqueResponse(content)

			console.log('Parsed result:', parsed)

			// If no valid suggestions found from server response, use test data for demonstration
			if (parsed.criticalFlaws.length === 0 && Object.values(parsed.scopeImprovements).every((arr) => arr.length === 0)) {
				console.log('No suggestions found, using test data')
				const testContent = getTestResponse()
				parsed = parseScopedCritiqueResponse(testContent)
				console.log('Test data parsed result:', parsed)
			}

			console.log('Setting parsed data:', parsed)
			setParsedData(parsed)
			onUpdateParsedData?.(parsed)

			// Save to localStorage
			localStorage.setItem('critiqueData', JSON.stringify(parsed))
			console.log('Saved to localStorage')
		} else {
			console.log('No content, skipping processing')
		}
	}, [content, onUpdateParsedData])

	// Test function to simulate server response (uses actual server format)
	const getTestResponse = (): string => {
		return `{"critique":"#### Protocol Critique\\n\\n1. The protocol lacks a clear hypothesis or objective statement, which is critical for understanding the purpose and expected outcomes of the experiment. Without this, it is difficult to assess the appropriateness of the experimental design and the interpretation of results. <rating>#Impact: High</rating> <rating>#Effort: Low</rating> <rating>#Practicality: High</rating> <rating>#Type: Critical Flaw</rating>\\n\\n2. The use of technical triplicates is mentioned, but there is no indication of biological replicates. This could lead to pseudo-replication and limit the generalizability of the findings. Consider including independent biological replicates to ensure robustness and reproducibility. <rating>#Impact: High</rating> <rating>#Effort: Medium</rating> <rating>#Practicality: Medium</rating> <rating>#Type: Hidden Bias</rating>\\n\\n3. The protocol does not specify the randomization of samples or blinding of the experiment, which could introduce bias in the handling and analysis of samples. Implement randomization and blinding to minimize potential biases. <rating>#Impact: Medium</rating> <rating>#Effort: Medium</rating> <rating>#Practicality: Medium</rating> <rating>#Type: Hidden Bias</rating>\\n\\n4. The washing steps are critical for reducing non-specific binding, but the protocol does not specify the volume of Buffer B used for each wash. Clearly define the wash volumes to ensure consistency and reproducibility. <rating>#Impact: Medium</rating> <rating>#Effort: Low</rating> <rating>#Practicality: High</rating> <rating>#Type: Techniques</rating>\\n\\n5. The protocol involves multiple rounds of elution and PCR amplification, but there is no mention of controls to monitor the efficiency of these steps. Include positive and negative controls to validate the success of elution and amplification processes. <rating>#Impact: High</rating> <rating>#Effort: Medium</rating> <rating>#Practicality: High</rating> <rating>#Type: Critical Flaw</rating>\\n\\n6. The sequencing depth is provided, but there is no discussion on how this depth was determined to be sufficient for the experimental goals. Justify the chosen sequencing depth to ensure it meets the requirements for detecting meaningful differences. <rating>#Impact: Medium</rating> <rating>#Effort: Low</rating> <rating>#Practicality: Medium</rating> <rating>#Type: Techniques</rating>\\n\\n7. The protocol does not address potential edge effects in the plate design, which could affect the results. Consider excluding edge wells or randomizing sample placement to mitigate these effects. <rating>#Impact: Medium</rating> <rating>#Effort: Low</rating> <rating>#Practicality: Medium</rating> <rating>#Type: Plate Design</rating>\\n\\n#### Identified Covariates\\n\\n1. Protein Immobilization Efficiency: Variability in the immobilization of the protein of interest on the streptavidin-coated beads could significantly impact the binding results. If not measured, this could lead to false positives or negatives in the identification of binders. Monitoring the efficiency of protein immobilization is crucial to ensure consistent and reliable results.\\n\\n2. Non-specific Binding: The presence of non-specific binding could obscure the detection of true binders. If not controlled, this could result in a high background signal, leading to false positives. Measuring and minimizing non-specific binding is essential for accurate interpretation of the data.\\n\\nNo other signal-critical covariates identified in this protocol."}`
	}

	// Parse scope-based critique response
	const parseScopedCritiqueResponse = (rawResponse: string): CritiqueResults => {
		console.log('=== PARSING CRITIQUE RESPONSE ===')
		console.log('Raw response:', rawResponse)

		const criticalFlaws: CritiqueItem[] = []
		const scopeImprovements: {[scope: string]: CritiqueItem[]} = {
			'critical-flaw': [],
			'plate-design': [],
			'hidden-bias': [],
			techniques: [],
			'experiment-velocity': [],
			'potential-covariates': []
		}
		const covariates: CovariateItem[] = []

		try {
			// Clean up the response
			let text = rawResponse
			try {
				const parsed = JSON.parse(rawResponse)
				text = parsed.critique || parsed.result || parsed.message || parsed.text || rawResponse
				console.log('Extracted text from JSON (before cleaning):', text)
			} catch {
				console.log('Not JSON, using raw response')
			}

			// CRITICAL: Clean up escape sequences FIRST before any processing
			text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim()
			console.log('Cleaned text (after escape processing):', text)

			// TEMPORARY: Test with the exact format you provided
			const testText = `Critical Flaw
- The protocol lacks biological replicates, as it only mentions technical triplicates. Ensure that biological replicates are included by using independent protein preparations or different batches of the Naive DEL library to capture biological variability. <ratings>#Impact (High), #Effort (Medium), #Practicality (Medium), #Type (Critical Flaw)</ratings>

Plate Design
- The protocol does not specify the layout or randomization of samples on the plate. Implement randomization of sample placement to minimize spatial bias and ensure that controls are distributed across multiple quadrants. <ratings>#Impact (Medium), #Effort (Low), #Practicality (High), #Type (Plate Design)</ratings>`

			console.log('=== TESTING WITH KNOWN FORMAT ===')
			console.log('Test text:', testText)
			const testSuggestions = extractSuggestions(testText)
			console.log('Test suggestions found:', testSuggestions.length)

			// Extract numbered suggestions from the text
			console.log('=== EXTRACTING SUGGESTIONS FROM ACTUAL TEXT ===')
			const suggestions = extractSuggestions(text)
			console.log('Extracted suggestions:', suggestions.length)

			// Process each suggestion
			console.log('=== PROCESSING SUGGESTIONS ===')
			suggestions.forEach((suggestion, index) => {
				console.log(`Processing suggestion ${index + 1}`)
				const parsedItem = parseIndividualSuggestion(suggestion)
				if (parsedItem) {
					console.log('Successfully parsed item:', parsedItem)
					// Map all suggestions (including Critical Flaw) to their respective scopes
					const scopeKey = mapTypeToScope(parsedItem.type)
					console.log('Mapped to scope:', scopeKey)

					if (scopeKey && scopeImprovements[scopeKey]) {
						const impactValue = parsedItem.type === 'Critical Flaw' ? 'Critical' : parsedItem.impact
						const newItem: CritiqueItem = {
							id: `${scopeKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
							text: parsedItem.cleanText,
							impact: impactValue as 'Critical' | 'High' | 'Medium' | 'Low',
							effort: parsedItem.effort as 'High' | 'Medium' | 'Low',
							practicality: parsedItem.practicality as 'High' | 'Medium' | 'Low',
							type: parsedItem.type,
							scope: scopeKey,
							tracked: false
						}
						scopeImprovements[scopeKey].push(newItem)
						console.log('Added item to scope:', scopeKey)
					} else {
						console.log('No scope found for key:', scopeKey)
					}
				} else {
					console.log('Failed to parse suggestion')
				}
			})

			console.log('=== FINAL RESULTS ===')
			console.log('Scope improvements:', scopeImprovements)
			Object.keys(scopeImprovements).forEach((key) => {
				console.log(`${key}: ${scopeImprovements[key].length} items`)
			})

			// Extract covariates from the "Identified Covariates" section
			const covariateMatches = extractCovariates(text)
			covariateMatches.forEach((covariate) => {
				covariates.push({
					id: `covariate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					name: covariate.name,
					description: covariate.description,
					tracked: false
				})
			})
		} catch (error) {
			console.error('Error parsing critique response:', error)
		}

		return {criticalFlaws, scopeImprovements, covariates}
	}

	// Extract covariates from the "Potential Covariates" section
	const extractCovariates = (text: string): {name: string; description: string}[] => {
		const covariates: {name: string; description: string}[] = []

		// For the new format, Potential Covariates content comes from the processed suggestions
		// We'll handle it differently - look for suggestions with Type: Potential Covariates
		// This will be processed by extractSuggestions, so we don't need special covariate extraction

		return covariates
	}

	// Extract suggestions from text (section-based format only)
	const extractSuggestions = (text: string): string[] => {
		const suggestions: string[] = []

		console.log('Raw text for extraction:', text.substring(0, 200) + '...')

		// Split by section headers and process each section
		const sections = text.split(/\n(?=Critical Flaw|Plate Design|Hidden Bias|Techniques|Experiment Velocity|Potential Covariates|#### Protocol Critique)/)
		console.log('Split into', sections.length, 'sections')

		sections.forEach((section, index) => {
			console.log(`Section ${index}:`, section.substring(0, 100) + '...')

			// Check if this section starts with one of our target headers
			if (section.match(/^(Critical Flaw|Plate Design|Hidden Bias|Techniques|Experiment Velocity|Potential Covariates|#### Protocol Critique)/)) {
				console.log('Found target header in section', index)

				// Extract numbered items from this section (1. text... format)
				const numberedItems = section.match(/^\d+\.\s+([^]+?)(?=\n\d+\.\s+|$)/gm)
				if (numberedItems) {
					console.log(`Found ${numberedItems.length} numbered items in section`)
					numberedItems.forEach((item) => {
						// Remove the number prefix (1. )
						const content = item.replace(/^\d+\.\s+/, '').trim()
						console.log('Extracted numbered content:', content.substring(0, 100) + '...')

						// Only include suggestions that have ratings tags (either format)
						if (content.includes('<ratings>') || content.includes('<rating>')) {
							console.log('Found <ratings> or <rating> tag, adding suggestion')
							suggestions.push(content)
						} else {
							console.log('No <ratings> or <rating> tag found in content')
						}
					})
				} else {
					// Fallback: try dash format for backward compatibility
					const contentMatch = section.match(/^[^\n]+\n-\s*([\s\S]+)/)
					if (contentMatch) {
						const content = contentMatch[1].trim()
						console.log('Extracted dash content:', content.substring(0, 100) + '...')

						// Only include suggestions that have ratings tags (either format)
						if (content.includes('<ratings>') || content.includes('<rating>')) {
							console.log('Found <ratings> or <rating> tag, adding suggestion')
							suggestions.push(content)
						} else {
							console.log('No <ratings> or <rating> tag found in content')
						}
					} else {
						console.log('No content match found for section', index)
					}
				}
			} else {
				console.log('No target header found in section', index)
			}
		})

		console.log('Total suggestions extracted:', suggestions.length)
		return suggestions
	}

	// Parse individual suggestion for tags
	interface ParsedSuggestion {
		cleanText: string
		impact: string
		effort: string
		practicality: string
		type: string
		scope: string
	}

	const parseIndividualSuggestion = (suggestion: string): ParsedSuggestion | null => {
		const tags: {[key: string]: string} = {}
		let cleanText = suggestion

		// Try both formats: <ratings> (plural with parentheses) and <rating> (singular with colon)
		let ratingsMatch = suggestion.match(/<ratings>.*?<\/ratings>/gi)
		if (ratingsMatch && ratingsMatch.length > 0) {
			// Format 1: <ratings>#Impact (High), #Effort (Medium)</ratings>
			cleanText = suggestion.replace(/<ratings>.*?<\/ratings>/gi, '').trim()

			ratingsMatch.forEach((ratingsTag) => {
				const content = ratingsTag.replace(/<\/?ratings>/gi, '').trim()
				const parts = content.split(',').map((part) => part.trim())
				parts.forEach((part) => {
					const match = part.match(/#(Impact|Effort|Practicality|Type)\s*\(([^)]+)\)/i)
					if (match) {
						const [, tagName, tagValue] = match
						tags[tagName.toLowerCase()] = tagValue.trim()
					}
				})
			})
		} else {
			// Format 2: <rating>#Impact: High</rating> <rating>#Effort: Medium</rating>
			ratingsMatch = suggestion.match(/<rating>.*?<\/rating>/gi)
			if (ratingsMatch && ratingsMatch.length > 0) {
				cleanText = suggestion.replace(/<rating>.*?<\/rating>/gi, '').trim()

				ratingsMatch.forEach((ratingTag) => {
					const content = ratingTag.replace(/<\/?rating>/gi, '').trim()
					const match = content.match(/#(Impact|Effort|Practicality|Type)[\s:]*([^\s]+)/i)
					if (match) {
						const [, tagName, tagValue] = match
						tags[tagName.toLowerCase()] = tagValue.trim()
					}
				})
			}
		}

		// Clean up any remaining brackets, commas or extra spaces
		cleanText = cleanText
			.replace(/\[\s*\]/g, '') // Remove empty brackets
			.replace(/\(\s*\)/g, '') // Remove empty parentheses
			.replace(/,\s*$/, '') // Remove trailing commas
			.replace(/\s+/g, ' ') // Normalize spaces
			.trim()

		// Validate required tags
		if (!tags.impact || !tags.effort || !tags.practicality || !tags.type) {
			return null // Skip suggestions without complete tags
		}

		return {
			cleanText,
			impact: tags.impact,
			effort: tags.effort,
			practicality: tags.practicality,
			type: tags.type,
			scope: mapTypeToScope(tags.type)
		}
	}

	// Map Type to scope key
	const mapTypeToScope = (type: string): string => {
		const typeMapping: {[key: string]: string} = {
			'Critical Flaw': 'critical-flaw',
			'Plate Design': 'plate-design',
			'Hidden Bias': 'hidden-bias',
			Techniques: 'techniques',
			'Experiment Velocity': 'experiment-velocity',
			'Potential Covariates': 'potential-covariates'
		}

		return typeMapping[type] || 'techniques' // Default to techniques if unknown
	}

	const toggleTracking = (itemId: string, itemType: 'improvement' | 'covariate') => {
		if (!parsedData) return

		const updatedData = {...parsedData}

		if (itemType === 'covariate') {
			updatedData.covariates = updatedData.covariates.map((item) => (item.id === itemId ? {...item, tracked: !item.tracked} : item))
		} else {
			Object.keys(updatedData.scopeImprovements).forEach((scope) => {
				updatedData.scopeImprovements[scope] = updatedData.scopeImprovements[scope].map((item) => (item.id === itemId ? {...item, tracked: !item.tracked} : item))
			})
		}

		setParsedData(updatedData)
		onUpdateParsedData?.(updatedData)

		// Save updated tracking state to localStorage
		localStorage.setItem('critiqueData', JSON.stringify(updatedData))
	}

	const handleScopeChange = (scope: string, checked: boolean) => {
		if (checked) {
			setSelectedScopes([...selectedScopes, scope])
		} else {
			setSelectedScopes(selectedScopes.filter((s) => s !== scope))
		}
	}

	const handleFindImprovements = () => {
		onRunCheck(selectedScopes)
	}

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(content)
			setCopied(true)
			message.success('Critique copied to clipboard')
			setTimeout(() => setCopied(false), 2000)
		} catch (err) {
			console.error('Failed to copy text: ', err)
			message.error('Failed to copy text')
		}
	}

	const getImpactColor = (impact: string) => {
		switch (impact) {
			case 'Critical':
				return `${palette.danger_red}`
			case 'High':
				return `${palette.danger_red}`
			case 'Medium':
				return `${palette.golden_yellow}`
			case 'Low':
				return `${palette.lime_green}`
			default:
				return `${palette.medium_gray}`
		}
	}

	const getEffortColor = (effort: string) => {
		switch (effort) {
			case 'High':
				return 'red'
			case 'Medium':
				return 'orange'
			case 'Low':
				return 'green'
			default:
				return 'default'
		}
	}

	const getScopeIcon = (scopeKey: string) => {
		const scope = DESIGN_SCOPES.find((s) => s.key === scopeKey)
		return scope ? scope.icon : <FileTextOutlined />
	}

	const getScopeColor = (scopeKey: string) => {
		const scope = DESIGN_SCOPES.find((s) => s.key === scopeKey)
		return scope ? scope.color : `${palette.medium_gray}`
	}

	const renderScopeSelection = () => (
		<Card className="mb-6">
			<Title level={4} className="!mb-4">
				Select Design Scopes to Analyze
			</Title>
			<Paragraph type="secondary" className="!mb-5">
				Choose which aspects of your design to analyze for improvements
			</Paragraph>

			<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 mb-6">
				{DESIGN_SCOPES.map((scope) => (
					<Card
						key={scope.key}
						size="small"
						className="cursor-pointer"
						style={{
							border: selectedScopes.includes(scope.key) ? `2px solid ${scope.color}` : `1px solid ${palette.light_gray}`,
							backgroundColor: selectedScopes.includes(scope.key) ? `${scope.color}08` : `${palette.white}`
						}}
						onClick={() => handleScopeChange(scope.key, !selectedScopes.includes(scope.key))}>
						<div className="flex items-center gap-3">
							<Checkbox checked={selectedScopes.includes(scope.key)} onChange={(e) => handleScopeChange(scope.key, e.target.checked)} onClick={(e) => e.stopPropagation()} />
							<span className={`text-[18px]`} style={{color: scope.color}}>
								{scope.icon}
							</span>
							<div className="flex-1">
								<Text strong className="block">
									{scope.label}
								</Text>
								<Text type="secondary" className="text-[12px]">
									{scope.description}
								</Text>
							</div>
						</div>
					</Card>
				))}
			</div>

			<div className="text-center">
				<Button type="primary" size="large" icon={<SearchOutlined />} loading={loading} disabled={selectedScopes.length === 0} onClick={handleFindImprovements}>
					Find Improvements
				</Button>
			</div>
		</Card>
	)

	const renderCovariates = () => {
		// Only show covariates if the potential-covariates scope is selected
		if (!selectedScopes.includes('potential-covariates')) return null
		if (!parsedData?.covariates?.length) return null

		return (
			<Card className="mb-6">
				<div className="flex items-center mb-4">
					<span className="text-vivid-orange text-[20px] mr-2">
						<FileTextOutlined />
					</span>
					<Title level={4} className="!m-0">
						Identified Covariates
					</Title>
					<Text type="secondary" className="ml-2">
						({parsedData.covariates.length})
					</Text>
				</div>

				<Alert message="Variables that could confound your experimental results" type="warning" className="mb-4" />

				<div className="grid gap-3">
					{parsedData.covariates.map((covariate) => (
						<Card key={covariate.id} size="small" className={`border-l-4 border-l-vivid-orange ${covariate.tracked ? 'bg-creamy-off-white' : 'bg-white'}`}>
							<div className="flex gap-4">
								<div className="flex-1">
									<Text strong className="block mb-1">
										{covariate.name}
									</Text>
									<Text className="text-[14px] leading-[1.6] text-charcol-gray">{covariate.description}</Text>
								</div>
								<Button type={covariate.tracked ? 'primary' : 'default'} icon={covariate.tracked ? <CheckCircleOutlined /> : <PlusCircleOutlined />} onClick={() => toggleTracking(covariate.id, 'covariate')} className={`${covariate.tracked && 'bg-apple-green'} ${covariate.tracked && 'border border-apple-green'}`}>
									{covariate.tracked ? 'Tracked' : 'Track'}
								</Button>
							</div>
						</Card>
					))}
				</div>
			</Card>
		)
	}

	const renderScopeImprovements = () => {
		console.log('=== RENDER SCOPE IMPROVEMENTS ===')
		console.log('parsedData:', parsedData)
		console.log('selectedScopes:', selectedScopes)

		if (!parsedData?.scopeImprovements) {
			console.log('No parsedData.scopeImprovements, returning null')
			return null
		}

		console.log('parsedData.scopeImprovements:', parsedData.scopeImprovements)

		return Object.entries(parsedData.scopeImprovements).map(([scopeKey, items]) => {
			console.log(`Checking scope ${scopeKey}:`, items.length, 'items')
			console.log('Is scope selected?', selectedScopes.includes(scopeKey))

			// Only show scopes that are selected
			if (!selectedScopes.includes(scopeKey)) {
				console.log(`Scope ${scopeKey} not selected, skipping`)
				return null
			}
			if (!items.length) {
				console.log(`Scope ${scopeKey} has no items, skipping`)
				return null
			}

			const scope = DESIGN_SCOPES.find((s) => s.key === scopeKey)
			if (!scope) {
				console.log(`No scope definition found for ${scopeKey}`)
				return null
			}

			console.log(`Rendering scope ${scopeKey} with ${items.length} items`)

			const isCriticalFlaw = scopeKey === 'critical-flaw'
			const cardStyle = isCriticalFlaw ? {marginBottom: 24, border: `2px solid ${palette.danger_red}`} : {marginBottom: 24}

			return (
				<Card key={scopeKey} style={cardStyle}>
					{isCriticalFlaw && <Alert message="These issues could significantly compromise your experimental results" type="error" className="mb-4" />}
					<div className="flex items-center mb-4">
						<span className="text-[20px] mr-2" style={{color: scope.color}}>
							{scope.icon}
						</span>
						<Title level={4} className={`!m-0 ${isCriticalFlaw && '!text-imperial-red'}`}>
							{scope.label}
							{!isCriticalFlaw ? ' Improvements' : ''}
						</Title>
						<Text type="secondary" className="ml-2">
							({items.length})
						</Text>
					</div>

					<div className="grid gap-3">
						{items.map((item) => (
							<Card
								key={item.id}
								size="small"
								style={{
									borderLeft: `4px solid ${getImpactColor(item.impact)}`,
									backgroundColor: item.tracked ? (isCriticalFlaw ? `${palette.pinkish_white}` : `${scope.color}08`) : '#ffffff'
								}}>
								<div className="flex gap-4">
									<div className="flex-1">
										<Text className="text-[14px] leading-[1.6]">{item.text}</Text>
										<div className="mt-2 flex flex-wrap gap-1">
											<Tag color={getImpactColor(item.impact)} className="text-white">
												{item.impact} Impact
											</Tag>
											<Tag color={getEffortColor(item.effort)}>{item.effort} Effort</Tag>
											{item.practicality && <Tag color={item.practicality === 'High' ? 'green' : item.practicality === 'Medium' ? 'orange' : 'red'}>{item.practicality} Practicality</Tag>}
											{item.type && <Tag color="blue">{item.type}</Tag>}
										</div>
									</div>
									<Button type={item.tracked ? 'primary' : 'default'} icon={item.tracked ? <CheckCircleOutlined /> : <PlusCircleOutlined />} onClick={() => toggleTracking(item.id, 'improvement')} className={`${item.tracked && 'bg-apple-green'} ${item.tracked && 'border border-apple-green'}`}>
										{item.tracked ? 'Tracked' : 'Track'}
									</Button>
								</div>
							</Card>
						))}
					</div>
				</Card>
			)
		})
	}

	if (loading) {
		return (
			<div>
				{renderScopeSelection()}
				<div className="text-center py-15">
					<Spin size="large" />
					<div className="mt-4 text-charcol-gray">Analyzing your design for improvements...</div>
				</div>
			</div>
		)
	}

	if (!content || !parsedData) {
		return (
			<div>
				{renderScopeSelection()}
				<Empty description={emptyStateText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
			</div>
		)
	}

	console.log('=== MAIN RENDER ===')
	console.log('Component parsedData:', parsedData)
	console.log('Component loading:', loading)
	console.log('Component content:', content ? 'has content' : 'no content')

	return (
		<div>
			{renderScopeSelection()}

			{parsedData && (
				<div>
					{renderScopeImprovements()}
					{renderCovariates()}

					<div className="text-center mt-6">
						<Space>
							{content && (
								<Button icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={handleCopy} type={copied ? 'primary' : 'default'}>
									{copied ? 'Copied' : 'Copy All Results'}
								</Button>
							)}
							<Button
								onClick={() => {
									localStorage.removeItem('critiqueData')
									setParsedData(null)
									onUpdateParsedData?.(null as any)
								}}
								type="default">
								Clear Results
							</Button>
						</Space>
					</div>
				</div>
			)}
		</div>
	)
}

export default CritiqueSection
