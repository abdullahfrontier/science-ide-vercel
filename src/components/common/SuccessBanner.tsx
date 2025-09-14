import React from 'react'
import {Card, Typography, Button, Alert} from 'antd'
import {cn} from '@/lib/util'

const {Title, Text} = Typography

interface SuccessBannerProps {
	title?: string
	message: string
	actionButton?: {
		label: string
		onClick: () => void
	}
	icon?: string
}

export const SuccessBanner: React.FC<SuccessBannerProps> = ({title = 'Success!', message, actionButton, icon = '✅'}) => {
	return (
		<div className="text-center py-12">
			<div className="text-5xl mb-4">{icon}</div>
			<Title level={3}>{title}</Title>
			<Text type="secondary">{message}</Text>
			{actionButton && (
				<div className="mt-6">
					<Button onClick={actionButton.onClick} type="primary" size="large">
						{actionButton.label}
					</Button>
				</div>
			)}
		</div>
	)
}

/*
TODO.. not being used. make seprate component if required

interface ErrorAlertProps {
	error: string
	onClose?: () => void
	closable?: boolean
	showIcon?: boolean
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({error, onClose, closable = true, showIcon = true}) => {
	if (!error) return null

	return <Alert message={error} type="error" showIcon={showIcon} closable={closable} onClose={onClose} className="mb-4" />
}

interface LoadingCardProps {
	message?: string
	size?: 'small' | 'default' | 'large'
}

export const LoadingCard: React.FC<LoadingCardProps> = ({message = 'Loading...', size = 'default'}) => {
	return (
		<Card>
			<div className="text-center py-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
				<Text type="secondary">{message}</Text>
			</div>
		</Card>
	)
}

interface EmptyStateCardProps {
	title: string
	description: string
	icon?: React.ReactNode
	action?: {
		label: string
		onClick: () => void
	}
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({title, description, icon, action}) => {
	return (
		<Card>
			<div className="text-center py-12">
				{icon && <div className="text-4xl mb-4">{icon}</div>}
				<Title level={4} type="secondary">
					{title}
				</Title>
				<Text type="secondary">{description}</Text>
				{action && (
					<div className="mt-6">
						<Button type="primary" onClick={action.onClick}>
							{action.label}
						</Button>
					</div>
				)}
			</div>
		</Card>
	)
}
*/
