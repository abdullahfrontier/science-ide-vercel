import React from 'react'
import {STYLES} from '@/lib/styles'
import {cn} from '@/lib/util'

interface BaseTileProps {
	title?: string
	children: React.ReactNode
	className?: string
	childrenClassName?: string
	padding?: boolean
	variant?: 'default' | 'card' | 'transparent'
	height?: string | number
}

export function BaseTile({title, children, className = '', childrenClassName = '', padding = true, variant = 'default', height}: BaseTileProps) {
	const getVariantStyles = () => {
		switch (variant) {
			case 'card':
				return STYLES.card
			case 'transparent':
				return 'bg-transparent'
			default:
				return STYLES.tile
		}
	}

	const paddingStyles = padding ? (variant === 'card' ? '' : 'p-4') : ''
	const heightStyles = height ? (typeof height === 'number' ? `h-[${height}px]` : height) : ''

	return (
		<div className={cn(getVariantStyles(), paddingStyles, heightStyles, className)}>
			{title && (
				<div className="mb-4">
					<h3 className="text-lg font-medium text-foreground">{title}</h3>
				</div>
			)}
			<div className={childrenClassName}>{children}</div>
		</div>
	)
}
