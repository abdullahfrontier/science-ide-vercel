import React, {useState} from 'react'
import {Form, InputNumber, Select, Button, Space, Divider, Typography, Alert, Descriptions, Tag} from 'antd'
import {CalculatorOutlined, InfoCircleOutlined} from '@ant-design/icons'

const {Title, Text, Paragraph} = Typography
const {Option} = Select

interface PowerAnalysisResult {
	sampleSize: number
	power: number
	effectSize: number
	analysisType: string
	parameters: any
}

interface PowerAnalysisSectionProps {
	onResultsChange?: (results: PowerAnalysisResult | null) => void
}

const PowerAnalysisSection: React.FC<PowerAnalysisSectionProps> = ({onResultsChange}) => {
	const [form] = Form.useForm()
	const [loading, setLoading] = useState(false)
	const [results, setResults] = useState<PowerAnalysisResult | null>(null)
	const [analysisType, setAnalysisType] = useState<string>('two-sample-ttest')

	// Sample size calculation functions
	const calculateTwoSampleTTest = (params: any): PowerAnalysisResult => {
		const {alpha, power, effectSize, sd1, sd2, mean1, mean2} = params

		// Z-scores for standard normal distribution
		const zAlpha = getZScore(alpha / 2) // Two-tailed
		const zBeta = getZScore(1 - power)

		// Calculate pooled standard deviation
		const pooledSD = Math.sqrt((sd1 * sd1 + sd2 * sd2) / 2)

		// Calculate effect size if means provided
		let calculatedEffectSize = effectSize
		if (mean1 && mean2 && !effectSize) {
			calculatedEffectSize = Math.abs(mean1 - mean2) / pooledSD
		}

		// Sample size formula: N = 2 * (zα + zβ)² * (σ²) / δ²
		const sampleSizePerGroup = (2 * Math.pow(zAlpha + zBeta, 2) * Math.pow(pooledSD, 2)) / Math.pow(calculatedEffectSize * pooledSD, 2)

		return {
			sampleSize: Math.ceil(sampleSizePerGroup * 2), // Total sample size
			power,
			effectSize: calculatedEffectSize,
			analysisType: 'Two-Sample T-Test',
			parameters: {
				samplePerGroup: Math.ceil(sampleSizePerGroup),
				pooledSD,
				alpha,
				power
			}
		}
	}

	const calculateOneSampleTTest = (params: any): PowerAnalysisResult => {
		const {alpha, power, effectSize, sd, mean, hypothesizedMean} = params

		const zAlpha = getZScore(alpha / 2)
		const zBeta = getZScore(1 - power)

		let calculatedEffectSize = effectSize
		if (mean && hypothesizedMean && !effectSize) {
			calculatedEffectSize = Math.abs(mean - hypothesizedMean) / sd
		}

		// Sample size formula: n = (zα + zβ)² * (σ/δ)²
		const sampleSize = Math.pow(zAlpha + zBeta, 2) * Math.pow(sd / (calculatedEffectSize * sd), 2)

		return {
			sampleSize: Math.ceil(sampleSize),
			power,
			effectSize: calculatedEffectSize,
			analysisType: 'One-Sample T-Test',
			parameters: {alpha, power, sd}
		}
	}

	const calculateProportionTest = (params: any): PowerAnalysisResult => {
		const {alpha, power, p1, p2} = params

		const zAlpha = getZScore(alpha / 2)
		const zBeta = getZScore(1 - power)

		const p = (p1 + p2) / 2
		const effectSize = Math.abs(p1 - p2)

		// Sample size formula for two proportions
		const sampleSizePerGroup = Math.pow(zAlpha * Math.sqrt(2 * p * (1 - p)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) / Math.pow(p1 - p2, 2)

		return {
			sampleSize: Math.ceil(sampleSizePerGroup * 2),
			power,
			effectSize,
			analysisType: 'Two-Proportion Test',
			parameters: {
				samplePerGroup: Math.ceil(sampleSizePerGroup),
				alpha,
				power,
				p1,
				p2
			}
		}
	}

	// Approximate z-score calculation (inverse normal distribution)
	const getZScore = (p: number): number => {
		// Approximate inverse normal distribution using rational approximation
		if (p <= 0 || p >= 1) return 0

		const c0 = 2.515517
		const c1 = 0.802853
		const c2 = 0.010328
		const d1 = 1.432788
		const d2 = 0.189269
		const d3 = 0.001308

		let t, z
		if (p > 0.5) {
			t = Math.sqrt(-2 * Math.log(1 - p))
			z = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t)
		} else {
			t = Math.sqrt(-2 * Math.log(p))
			z = -(t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t))
		}

		return z
	}

	const handleCalculate = async () => {
		try {
			setLoading(true)
			const values = await form.validateFields()

			let result: PowerAnalysisResult

			switch (analysisType) {
				case 'one-sample-ttest':
					result = calculateOneSampleTTest(values)
					break
				case 'two-sample-ttest':
					result = calculateTwoSampleTTest(values)
					break
				case 'proportion-test':
					result = calculateProportionTest(values)
					break
				default:
					throw new Error('Unknown analysis type')
			}

			setResults(result)
			onResultsChange?.(result)
		} catch (error) {
			console.error('Calculation error:', error)
		} finally {
			setLoading(false)
		}
	}

	const getEffectSizeInterpretation = (effectSize: number): {label: string; color: string} => {
		if (effectSize < 0.2) return {label: 'Very Small', color: 'red'}
		if (effectSize < 0.5) return {label: 'Small', color: 'orange'}
		if (effectSize < 0.8) return {label: 'Medium', color: 'blue'}
		return {label: 'Large', color: 'green'}
	}

	const renderParameterInputs = () => {
		const commonInputs = (
			<>
				<Form.Item
					name="alpha"
					label="Significance Level (α)"
					initialValue={0.05}
					rules={[{required: true, message: 'Required'}]}
					tooltip={{
						title: (
							<div>
								<div>
									<strong>Significance Level (Alpha)</strong>
								</div>
								<div>• Probability of Type I error (false positive)</div>
								<div>• Standard: 0.05 (5% chance of false positive)</div>
								<div>• Lower values = more stringent test</div>
								<div>• Common values: 0.05, 0.01, 0.001</div>
							</div>
						)
					}}>
					<InputNumber className="w-full" min={0.001} max={0.1} step={0.001} placeholder="0.05" />
				</Form.Item>

				<Form.Item
					name="power"
					label="Statistical Power (1-β)"
					initialValue={0.8}
					rules={[{required: true, message: 'Required'}]}
					tooltip={{
						title: (
							<div>
								<div>
									<strong>Statistical Power</strong>
								</div>
								<div>• Probability of detecting a true effect if it exists</div>
								<div>• Standard: 0.8 (80% chance of detection)</div>
								<div>• Higher power = better chance of finding real effects</div>
								<div>• Range: 0.5 to 0.99 (higher requires more participants)</div>
							</div>
						)
					}}>
					<InputNumber className="w-full" min={0.5} max={0.99} step={0.01} placeholder="0.8" />
				</Form.Item>
			</>
		)

		switch (analysisType) {
			case 'one-sample-ttest':
				return (
					<>
						{commonInputs}
						<Form.Item
							name="sd"
							label="Standard Deviation"
							rules={[{required: true, message: 'Required'}]}
							tooltip={{
								title: (
									<div>
										<div>
											<strong>Standard Deviation</strong>
										</div>
										<div>• Measure of variability in your data</div>
										<div>• Use from pilot study or literature</div>
										<div>• Higher SD = more participants needed</div>
										<div>• Must be &gt; 0</div>
									</div>
								)
							}}>
							<InputNumber className="w-full" min={0.01} step={0.1} placeholder="Enter SD from pilot data" />
						</Form.Item>
						<Divider orientation="left">
							<Text strong>Effect Size Method (Choose One)</Text>
						</Divider>
						<Form.Item
							name="effectSize"
							label="Effect Size (Cohen's d)"
							tooltip={{
								title: (
									<div>
										<div>
											<strong>{`Cohen's d (Effect Size)`}</strong>
										</div>
										<div>{`• Standardized measure of difference`}</div>
										<div>{`• Small effect: 0.2 (subtle difference)`}</div>
										<div>{`• Medium effect: 0.5 (moderate difference)`}</div>
										<div>{`• Large effect: 0.8 (obvious difference)`}</div>
										<div>{`• Use if you know the expected standardized difference`}</div>
									</div>
								)
							}}>
							<InputNumber className="w-full" min={0.01} step={0.1} placeholder="e.g., 0.5 for medium effect" />
						</Form.Item>
						<Text type="secondary" className="italic">
							OR specify the actual means if known:
						</Text>
						<Form.Item name="mean" label="Sample Mean" tooltip="Expected mean of your sample (from pilot data or hypothesis)">
							<InputNumber className="w-full" step={0.1} placeholder="Expected sample mean" />
						</Form.Item>
						<Form.Item name="hypothesizedMean" label="Hypothesized Mean" tooltip="Mean value under null hypothesis (e.g., population mean or control value)">
							<InputNumber className="w-full" step={0.1} placeholder="Null hypothesis mean" />
						</Form.Item>
					</>
				)

			case 'two-sample-ttest':
				return (
					<>
						{commonInputs}
						<Form.Item
							name="sd1"
							label="Group 1 Standard Deviation"
							rules={[{required: true, message: 'Required'}]}
							tooltip={{
								title: (
									<div>
										<div>
											<strong>{`Group 1 Standard Deviation`}</strong>
										</div>
										<div>{`• Variability in control/comparison group`}</div>
										<div>{`• Use from pilot study or literature`}</div>
										<div>{`• If unknown, use same value for both groups`}</div>
									</div>
								)
							}}>
							<InputNumber className="w-full" min={0.01} step={0.1} placeholder="SD of control/group 1" />
						</Form.Item>
						<Form.Item
							name="sd2"
							label="Group 2 Standard Deviation"
							rules={[{required: true, message: 'Required'}]}
							tooltip={{
								title: (
									<div>
										<div>
											<strong>Group 2 Standard Deviation</strong>
										</div>
										<div>• Variability in treatment/experimental group</div>
										<div>• Use from pilot study or literature</div>
										<div>• If unknown, use same value as Group 1</div>
									</div>
								)
							}}>
							<InputNumber className="w-full" min={0.01} step={0.1} placeholder="SD of treatment/group 2" />
						</Form.Item>
						<Divider orientation="left">
							<Text strong>Effect Size Method (Choose One)</Text>
						</Divider>
						<Form.Item
							name="effectSize"
							label="Effect Size (Cohen's d)"
							tooltip={{
								title: (
									<div>
										<div>
											<strong>{`Cohen's d Between Groups`}</strong>
										</div>
										<div>• Standardized difference between group means</div>
										<div>• Small: 0.2 (subtle group difference)</div>
										<div>• Medium: 0.5 (moderate group difference)</div>
										<div>• Large: 0.8 (obvious group difference)</div>
										<div>• Formula: (Mean1 - Mean2) / Pooled SD</div>
									</div>
								)
							}}>
							<InputNumber className="w-full" min={0.01} step={0.1} placeholder="e.g., 0.5 for medium effect" />
						</Form.Item>
						<Text type="secondary" className="italic">
							OR specify the actual group means if known:
						</Text>
						<Form.Item name="mean1" label="Group 1 Mean" tooltip="Expected mean for control/comparison group">
							<InputNumber className="w-full" step={0.1} placeholder="Control group mean" />
						</Form.Item>
						<Form.Item name="mean2" label="Group 2 Mean" tooltip="Expected mean for treatment/experimental group">
							<InputNumber className="w-full" step={0.1} placeholder="Treatment group mean" />
						</Form.Item>
					</>
				)

			case 'proportion-test':
				return (
					<>
						{commonInputs}
						<Form.Item
							name="p1"
							label="Proportion 1 (Control Group)"
							rules={[{required: true, message: 'Required'}]}
							tooltip={{
								title: (
									<div>
										<div>
											<strong>Control Group Proportion</strong>
										</div>
										<div>• Baseline rate or control condition</div>
										<div>• Express as decimal (e.g., 0.3 = 30%)</div>
										<div>• Use from historical data or literature</div>
										<div>• Must be between 0.01 and 0.99</div>
									</div>
								)
							}}>
							<InputNumber className="w-full" min={0.01} max={0.99} step={0.01} placeholder="e.g., 0.3 (30% baseline rate)" />
						</Form.Item>
						<Form.Item
							name="p2"
							label="Proportion 2 (Treatment Group)"
							rules={[{required: true, message: 'Required'}]}
							tooltip={{
								title: (
									<div>
										<div>
											<strong>Treatment Group Proportion</strong>
										</div>
										<div>• Expected rate after treatment/intervention</div>
										<div>• Express as decimal (e.g., 0.5 = 50%)</div>
										<div>• Should differ meaningfully from Proportion 1</div>
										<div>• Must be between 0.01 and 0.99</div>
									</div>
								)
							}}>
							<InputNumber className="w-full" min={0.01} max={0.99} step={0.01} placeholder="e.g., 0.5 (50% expected rate)" />
						</Form.Item>
					</>
				)

			default:
				return null
		}
	}

	return (
		<div>
			<Form form={form} layout="vertical" className="mb-6">
				<Form.Item label="Analysis Type" tooltip="Choose the statistical test for your experimental design">
					<Select
						value={analysisType}
						onChange={(value) => {
							setAnalysisType(value)
							setResults(null)
							form.resetFields()
						}}
						className="w-full">
						<Option value="one-sample-ttest">One-Sample T-Test</Option>
						<Option value="two-sample-ttest">Two-Sample T-Test (Independent Groups)</Option>
						<Option value="proportion-test">Two-Proportion Test</Option>
					</Select>
				</Form.Item>

				{renderParameterInputs()}

				<Form.Item>
					<Button type="primary" icon={<CalculatorOutlined />} loading={loading} onClick={handleCalculate} size="large">
						Calculate Sample Size
					</Button>
				</Form.Item>
			</Form>

			{results && (
				<>
					<Divider />
					<Title level={4}>Results</Title>

					<Alert
						message={`Recommended Sample Size: ${results.sampleSize} participants`}
						description={
							<div>
								{results.parameters.samplePerGroup && (
									<div>
										<strong>{results.parameters.samplePerGroup} per group</strong> (balanced design recommended)
									</div>
								)}
								<div className="mt-1 text-[12px] text-charcol-gray">This calculation assumes equal group sizes and normal distributions</div>
							</div>
						}
						type="success"
						showIcon
						className="mb-4"
					/>

					<Descriptions bordered column={2} className="overflow-x-auto overflow-y-hidden whitespace-nowrap des-responsive">
						<Descriptions.Item label="Analysis Type" span={2}>
							<Space>
								{results.analysisType}
								<Text type="secondary" className="text-[12px]">
									(Statistical test used for calculation)
								</Text>
							</Space>
						</Descriptions.Item>
						<Descriptions.Item label="Statistical Power">
							<Space direction="vertical" size={0}>
								<Text strong>{(results.power * 100)?.toFixed(1)}%</Text>
								<Text type="secondary" className="text-[11px]">
									Chance of detecting true effect
								</Text>
							</Space>
						</Descriptions.Item>
						<Descriptions.Item label="Effect Size">
							<Space direction="vertical" size={0}>
								<Space>
									<Text strong>{results?.effectSize?.toFixed(3)}</Text>
									<Tag color={getEffectSizeInterpretation(results.effectSize).color}>{getEffectSizeInterpretation(results.effectSize).label}</Tag>
								</Space>
								<Text type="secondary" className="text-[11px]">
									Standardized difference magnitude
								</Text>
							</Space>
						</Descriptions.Item>
						<Descriptions.Item label="Significance Level (α)">
							<Space direction="vertical" size={0}>
								<Text strong>{results.parameters.alpha}</Text>
								<Text type="secondary" className="text-[11px]">
									False positive rate
								</Text>
							</Space>
						</Descriptions.Item>
						<Descriptions.Item label="Type II Error (β)">
							<Space direction="vertical" size={0}>
								<Text strong>{(1 - results.power)?.toFixed(3)}</Text>
								<Text type="secondary" className="text-[11px]">
									False negative rate
								</Text>
							</Space>
						</Descriptions.Item>
					</Descriptions>

					<Alert
						className="my-4"
						message="Interpretation & Recommendations"
						description={
							<div>
								<Paragraph className="mb-2">
									<strong>📊 Effect Size:</strong> The {getEffectSizeInterpretation(results.effectSize).label.toLowerCase()} effect size ({results.effectSize?.toFixed(3)}){results.effectSize < 0.5 ? ' suggests subtle differences that may require larger sample sizes to detect reliably.' : results.effectSize < 0.8 ? ' represents a moderate difference that should be detectable with reasonable sample sizes.' : ' indicates a large difference that should be easily detectable.'}
								</Paragraph>
								<Paragraph className="mb-2">
									<strong>⚡ Statistical Power:</strong> With {results.sampleSize} participants, you have a {(results.power * 100)?.toFixed(0)}% chance of detecting the effect if it truly exists
									{results.power < 0.8 ? ' (below the recommended 80% threshold - consider increasing sample size).' : ' (meets the standard 80% threshold).'}
								</Paragraph>
								<Paragraph className="mb-2">
									<strong>🎯 Sample Size Adjustments:</strong>
								</Paragraph>
								<ul className="ml-4 mb-2">
									<li>
										<strong>Dropouts/Missing Data:</strong> Add 10-20% more participants ({Math.ceil(results.sampleSize * 1.1)}-{Math.ceil(results.sampleSize * 1.2)} total)
									</li>
									<li>
										<strong>Non-parametric Tests:</strong> Add ~15% more participants ({Math.ceil(results.sampleSize * 1.15)} total)
									</li>
									<li>
										<strong>Unequal Groups:</strong> Maintain total N but consider 2:1 or 3:1 ratios if needed
									</li>
								</ul>
								<Paragraph className="mb-0">
									<strong>📋 Next Steps:</strong> Verify assumptions (normality, equal variances) and consider pilot study if effect size estimates are uncertain.
								</Paragraph>
							</div>
						}
						type="info"
						showIcon
						icon={<InfoCircleOutlined />}
					/>
				</>
			)}
		</div>
	)
}

export default PowerAnalysisSection
