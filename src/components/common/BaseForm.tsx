import React, {ReactNode} from 'react'
import {Form, Card, Typography, Button, Alert, Space, Spin} from 'antd'
import {cn} from '@/lib/util'
import {SuccessBanner} from './SuccessBanner'

interface BaseFormProps {
	title: string
	icon?: ReactNode
	onFinish: (values: any) => Promise<void> | void
	loading?: boolean
	error?: string
	success?: boolean
	successMessage?: string
	successAction?: {
		label: string
		onClick: () => void
	}
	children: ReactNode
	submitButtonText?: string
	submitButtonProps?: any
	cardProps?: any
	formProps?: any
	showCard?: boolean
	loadingText?: string
	className?: string
}

export const BaseForm: React.FC<BaseFormProps> = ({title, icon, onFinish, loading = false, error, success = false, successMessage, successAction, children, submitButtonText = 'Submit', submitButtonProps = {}, cardProps = {}, formProps = {}, showCard = true, loadingText = 'Loading...', className}) => {
	const [form] = Form.useForm()
	const {Title, Text} = Typography

	// Success state
	if (success) {
		const successContent = <SuccessBanner message={successMessage || 'Operation completed successfully.'} actionButton={successAction} />

		return showCard ? <Card {...cardProps}>{successContent}</Card> : successContent
	}

	// Loading state
	if (loading && loadingText) {
		const loadingContent = (
			<div className="min-h-[200px] flex items-center justify-center">
				<Space size="middle">
					<Spin size="large" />
					<Typography.Text type="secondary">{loadingText}</Typography.Text>
				</Space>
			</div>
		)

		return showCard ? <Card {...cardProps}>{loadingContent}</Card> : loadingContent
	}

	// Form content
	const formContent = (
		<div className={cn('space-y-6', className)}>
			<div>
				<Title level={2}>
					{icon && <span className="mr-2">{icon}</span>}
					{title}
				</Title>
			</div>

			<Form form={form} layout="vertical" onFinish={onFinish} size="large" {...formProps}>
				{children}

				{error && (
					<Form.Item>
						<Alert message={error} type="error" showIcon closable />
					</Form.Item>
				)}

				<Form.Item>
					<Button type="primary" htmlType="submit" loading={loading} block size="large" {...submitButtonProps}>
						{submitButtonText}
					</Button>
				</Form.Item>
			</Form>
		</div>
	)

	return showCard ? <Card {...cardProps}>{formContent}</Card> : formContent
}
